import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import {
  createDailyRoomOptional,
  deleteDailyRoom,
  purgeSessionDailyRooms,
  ensureDailyMeetingAccess,
  getRoomUrl,
  mapDailyError,
  resolveRoomName
} from "../services/daily.service.js";
import { getSessionJoinWindow } from "../utils/session-join.js";
import { isSchemaV2, SCHEMA, sessionStartTime } from "../lib/schema.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { isSchemaError, mapDbError, SQL_SETUP_HINT } from "../utils/db-errors.js";
import { querySessionById, querySessionsList } from "../utils/session-select.js";
import { ensureUserProfile } from "../utils/ensure-user-profile.js";
import { incrementAttendeeStreaks, recordSessionEarnings } from "../utils/session-earnings.js";
import { getSessionStartAvailability } from "../utils/session-start.js";
import { reconcileCompletedTransaction } from "../utils/payments-fulfillment.js";
import { CACHE, withCache, safeInvalidateSessionCaches, invalidatePattern } from "../lib/cache.js";
import {
  clampSessionDuration,
  fetchSessionForJoin,
  fetchSessionForStart,
  isMissingColumnError,
  markSessionLive
} from "../utils/session-db.js";
import {
  getSessionForEnroll,
  getStudentProfileId,
  checkExistingEnrollment,
  checkFreeTrialUsed,
  resolveSessionSubjectId,
  getActiveSubscription,
  deductSubscriptionSession,
  computeSessionCheckout,
  createSessionPaymentCheckout,
  finalizeFreeOrPromoEnrollment,
  notifyEnrollmentConfirm,
  confirmEnrollment,
  normalizePaymentType
} from "../services/enrollmentService.js";
import { mapCheckoutResponse } from "../lib/schema.js";
import { cancelStudentEnrollment } from "../services/refundService.js";
import { refundAllSessionEnrollments } from "../services/refundService.js";

const createSessionSchema = z.object({
  title: z.string().min(3, "عنوان الجلسة قصير جداً").max(200),
  subject: z.string().min(1).optional(),
  grade: z.enum(["first", "second", "third"]).optional(),
  scheduled_at: z.string().min(1, "موعد الجلسة مطلوب"),
  duration_min: z.coerce.number().int().min(15).max(240).optional(),
  max_students: z.coerce.number().int().min(1).max(100).optional(),
  price_per_student: z.coerce.number().positive("السعر يجب أن يكون أكبر من صفر"),
  description: z.string().max(2000).optional().nullable(),
  subject_id: z.string().uuid().optional().nullable()
});

const router = Router();

async function getTeacherProfileForUser(userId) {
  let { data: teacher } = await supabase
    .from("teacher_profiles")
    .select("id,commission_rate")
    .eq("user_id", userId)
    .maybeSingle();

  if (!teacher) {
    const { data: userRow } = await supabase
      .from("users")
      .select("email, full_name, phone, role")
      .eq("id", userId)
      .maybeSingle();
    if (userRow?.role === "teacher") {
      await ensureUserProfile(supabase, {
        id: userId,
        email: userRow.email,
        full_name: userRow.full_name,
        role: "teacher",
        phone: userRow.phone
      });
      const retry = await supabase
        .from("teacher_profiles")
        .select("id,commission_rate")
        .eq("user_id", userId)
        .maybeSingle();
      teacher = retry.data;
    }
  }

  return teacher;
}

async function assertTeacherOwnsSession(sessionId, userId, res) {
  const { data: session, error: dbError } = await supabase
    .from("sessions")
    .select("teacher_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (dbError) {
    const mapped = mapDbError(dbError);
    error(res, mapped.message, mapped.status);
    return null;
  }
  if (!session) {
    error(res, "الجلسة غير موجودة", 404);
    return null;
  }
  if (session.teacher_id !== userId) {
    error(res, "غير مصرح لك بهذه الجلسة", 403);
    return null;
  }
  return session;
}

function handleRouteError(res, err, fallbackMessage) {
  const mapped = err?.dailyError || err?.dailyInfo ? mapDailyError(err) : mapDbError(err);
  if (process.env.NODE_ENV !== "production") {
    console.error(fallbackMessage, err);
  }
  return error(res, mapped.message || fallbackMessage, mapped.status);
}

async function insertSessionRow(payload) {
  const variants = [
    payload,
    (({ daily_room_name, description, subject_id, daily_room_url, room_url, ended_at, ...rest }) => rest)(
      payload
    ),
    (({
      start_time,
      price,
      duration_minutes,
      daily_room_name,
      description,
      subject_id,
      daily_room_url,
      room_url,
      ended_at,
      ...rest
    }) => rest)(payload)
  ];

  let lastError = null;
  for (const row of variants) {
    const { data, error: dbError } = await supabase.from("sessions").insert(row).select().single();
    if (!dbError) return data;
    lastError = dbError;
    if (!isMissingColumnError(dbError)) break;
  }
  throw lastError;
}

async function attachDailyRoomToSession(sessionId, title, maxStudents, existingRoom = null) {
  const room =
    existingRoom ||
    (await createDailyRoomOptional(title, {
      maxParticipants: maxStudents,
      expiryHours: 24 * 7
    }));
  if (!room) return null;

  const patchVariants = [
    { daily_room_url: room.url, daily_room_name: room.name, room_url: room.url },
    { room_url: room.url }
  ];

  for (const patch of patchVariants) {
    const { data, error: dbError } = await supabase
      .from("sessions")
      .update(patch)
      .eq("id", sessionId)
      .select("daily_room_url, room_url, daily_room_name")
      .maybeSingle();

    if (!dbError) return data || room;
    if (!isMissingColumnError(dbError)) {
      console.warn("[sessions] attach room:", dbError.message);
      break;
    }
  }
  return room;
}

router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role === "student") {
      return error(res, "استخدم /api/student/sessions لعرض الجلسات", 403);
    }
    if (req.user.role === "parent") {
      return error(res, "غير مصرح لك بعرض الجلسات", 403);
    }

    const { page = 1, limit = 20, subject, grade, status = "scheduled", search } = req.query;
    const { from, to } = paginate(page, limit);
    const ascending = status === "completed" || status === "cancelled" ? false : true;

    const cacheKey = CACHE.sessionsList({
      page: Number(page),
      limit: Number(limit),
      subject: subject || null,
      grade: grade || null,
      status: status || "scheduled",
      search: search || null,
      role: req.user.role,
      userId: req.user.role === "teacher" ? req.user.id : null
    });

    const cached = await withCache(cacheKey, CACHE.TTL.sessionsList, async () => {
      const { data, count, db_warning } = await querySessionsList((query, orderColumn, opts = {}) => {
        let q = query.range(from, to);

        if (req.user.role === "teacher") {
          q = q.eq("teacher_id", req.user.id);
        }

        if (status && status !== "all") {
          q = q.eq("status", status);
        }

        q = q.order(orderColumn, { ascending });

        if (grade) q = q.eq("grade", grade);
        if (search) {
          const term = String(search).trim();
          if (term) q = q.ilike("title", `%${term}%`);
        }

        if (subject) {
          const subjectValue = String(subject).trim();
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            subjectValue
          );
          if (!opts.skipSubjectId && isUuid) {
            q = q.eq("subject_id", subjectValue);
          } else {
            q = q.eq("subject", subjectValue);
          }
        }

        return q;
      });

      return { data: data || [], count: count ?? 0, db_warning };
    });

    const payload =
      cached && typeof cached === "object" && "data" in cached
        ? cached
        : { data: [], count: 0, db_warning: null };
    const { data = [], count = 0, db_warning } = payload;
    const { page: pageNum, limit: limitNum } = paginate(page, limit);

    if (db_warning) {
      res.setHeader("X-Peak-Db-Warning", "schema");
    }
    return paginated(res, data, paginationMeta(count, pageNum, limitNum), {
      ...(db_warning ? { warning: SQL_SETUP_HINT } : {})
    });
  } catch (err) {
    console.error("GET /sessions", err?.message || err);
    const { page: pageNum, limit: limitNum } = paginate(req.query.page, req.query.limit);
    const warning = isSchemaError(err)
      ? SQL_SETUP_HINT
      : mapDbError(err).message || SQL_SETUP_HINT;
    res.setHeader("X-Peak-Db-Warning", "schema");
    return paginated(res, [], paginationMeta(0, pageNum, limitNum), { warning });
  }
});

router.get("/:id/enrollments", auth, checkRole("teacher", "admin"), async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("sessions")
      .select("id, teacher_id, title")
      .eq("id", req.params.id)
      .single();

    if (!session) return error(res, "الجلسة غير موجودة", 404);

    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.role === "teacher" && session.teacher_id === req.user.id;
    if (!isAdmin && !isOwner) {
      return error(res, "غير مصرح لك بعرض طلاب هذه الجلسة", 403);
    }

    const { data, error: dbError } = await supabase
      .from("session_enrollments")
      .select(
        "id, status, created_at, student:student_profiles(id, user:users(id, full_name, email, phone))"
      )
      .eq("session_id", req.params.id)
      .order("created_at", { ascending: true });

    if (dbError) throw dbError;

    const enrollments = (data || []).map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      student_name: row.student?.user?.full_name || "طالب",
      student_email: row.student?.user?.email || null,
      student_phone: row.student?.user?.phone || null
    }));

    return success(res, { session, enrollments });
  } catch (err) {
    return handleRouteError(res, err, "تعذر تحميل الطلاب المسجلين");
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    if (req.user.role === "student") {
      return error(res, "استخدم /api/student/sessions/:id لعرض تفاصيل الجلسة", 403);
    }
    if (req.user.role === "parent") {
      return error(res, "غير مصرح لك بعرض هذه الجلسة", 403);
    }

    const scope = req.user.role === "teacher" ? req.user.id : "public";
    const cacheKey = CACHE.sessionDetail(req.params.id, scope);
    const session = await withCache(cacheKey, CACHE.TTL.sessionDetail, async () =>
      querySessionById(req.params.id, (q) => {
        if (req.user.role === "teacher") {
          return q.eq("teacher_id", req.user.id);
        }
        return q;
      })
    );

    if (!session) return error(res, "الجلسة غير موجودة", 404);
    return success(res, session);
  } catch (err) {
    if (isSchemaError(err)) {
      return error(res, SQL_SETUP_HINT, 500);
    }
    return handleRouteError(res, err, "تعذر تحميل الجلسة");
  }
});

router.post("/", auth, checkRole("teacher"), async (req, res) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "بيانات الجلسة غير صالحة";
      return error(res, msg, 400);
    }

    const body = parsed.data;
    const teacher = await getTeacherProfileForUser(req.user.id);
    if (!teacher) return error(res, "ملف المدرّس غير موجود. أكمل ملفك من الإعدادات.", 404);

    const scheduledAt = new Date(body.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      return error(res, "موعد الجلسة غير صالح", 400);
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return error(res, "موعد الجلسة يجب أن يكون في المستقبل", 400);
    }

    const maxStudents = body.max_students || 10;
    let room = null;
    let roomWarning = null;

    if (process.env.DAILY_API_KEY) {
      room = await createDailyRoomOptional(body.title, {
        maxParticipants: maxStudents,
        expiryHours: 24 * 7
      });
      if (!room) {
        roomWarning =
          "تم حفظ الجلسة بدون غرفة فيديو. سيُنشأ الرابط عند بدء الجلسة أو بعد ضبط DAILY_API_KEY.";
      }
    } else {
      roomWarning = "غرفة الفيديو غير مفعّلة (DAILY_API_KEY غير موجود على الخادم).";
    }

    const insertPayload = {
      id: `s-${Date.now()}`,
      teacher_id: req.user.id,
      title: body.title,
      subject: body.subject || "general",
      grade: body.grade || "third",
      scheduled_at: scheduledAt.toISOString(),
      duration_min: clampSessionDuration(body.duration_min),
      max_students: maxStudents,
      price_per_student: body.price_per_student,
      subject_id: body.subject_id || null,
      description: body.description || null,
      daily_room_url: room?.url || null,
      daily_room_name: room?.name || null,
      room_url: room?.url || null,
      status: "scheduled"
    };
    if (isSchemaV2()) {
      insertPayload.start_time = scheduledAt.toISOString();
      insertPayload.price = body.price_per_student;
      insertPayload.duration_minutes = clampSessionDuration(body.duration_min);
    }

    const session = await insertSessionRow(insertPayload);
    await safeInvalidateSessionCaches(session.id);

    const message = roomWarning
      ? "تم إنشاء الجلسة مع تنبيه بخصوص غرفة الفيديو"
      : "تم إنشاء الجلسة بنجاح";

    return success(
      res,
      { ...session, ...(roomWarning ? { room_warning: roomWarning } : {}) },
      message,
      201
    );
  } catch (err) {
    if (err?.dailyError) {
      const mapped = mapDailyError(err);
      return error(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, err, "تعذر إنشاء الجلسة");
  }
});

function isOpenSessionStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return normalized === "live" || normalized === "scheduled";
}

async function closeOneOpenSessionRow(session) {
  const status = String(session.status || "")
    .trim()
    .toLowerCase();
  const endedAt = new Date().toISOString();

  if (status === "live") {
    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "completed", ended_at: endedAt })
      .eq("id", session.id);
    if (sessionError) throw sessionError;

    await supabase
      .from("session_enrollments")
      .update({ status: "attended", left_at: endedAt })
      .eq("session_id", session.id)
      .eq("status", "enrolled");

    try {
      const teacherProfile = await getTeacherProfileForUser(session.teacher_id);
      if (teacherProfile) {
        await incrementAttendeeStreaks(session.id);
        await recordSessionEarnings(
          session.id,
          teacherProfile.id,
          teacherProfile.commission_rate
        );
      }
    } catch (earnErr) {
      console.warn("[sessions] close-open earnings skipped:", session.id, earnErr?.message || earnErr);
    }

    return "ended";
  }

  const { error: cancelError } = await supabase
    .from("sessions")
    .update({ status: "cancelled", ended_at: endedAt })
    .eq("id", session.id);
  if (cancelError) throw cancelError;

  try {
    await refundAllSessionEnrollments(session.id);
  } catch (refundErr) {
    console.warn("[sessions] close-open refund skipped:", session.id, refundErr?.message || refundErr);
  }

  return "cancelled";
}

router.post("/close-open", auth, checkRole("teacher", "admin"), async (req, res) => {
  try {
    let query = supabase
      .from("sessions")
      .select("id, status, teacher_id, daily_room_name, daily_room_url, room_url");

    if (req.user.role === "teacher") {
      query = query.eq("teacher_id", req.user.id);
    }

    const { data: allSessions, error: listError } = await query;
    if (listError) throw listError;

    const rows = (allSessions || []).filter((session) => isOpenSessionStatus(session.status));

    let ended = 0;
    let cancelled = 0;
    const failures = [];
    const roomNames = new Set();

    for (const session of rows) {
      try {
        const result = await closeOneOpenSessionRow(session);
        if (result === "ended") ended += 1;
        else cancelled += 1;

        const roomName = resolveRoomName(session);
        if (roomName) roomNames.add(roomName);
        await safeInvalidateSessionCaches(session.id);
      } catch (err) {
        failures.push({ id: session.id, message: err?.message || "فشل الإغلاق" });
      }
    }

    for (const roomName of roomNames) {
      await deleteDailyRoom(roomName);
    }

    let dailyPurge = { deleted: [], failed: [], skipped: true };
    try {
      dailyPurge = await purgeSessionDailyRooms();
    } catch (purgeErr) {
      console.warn("[sessions] daily purge:", purgeErr?.message || purgeErr);
      dailyPurge = { deleted: [], failed: [], skipped: true, error: purgeErr?.message };
    }

    await invalidatePattern("sessions:list:");

    const closedCount = ended + cancelled;
    const message =
      rows.length === 0 && (dailyPurge.deleted?.length || 0) === 0
        ? "لا توجد جلسات مفتوحة"
        : failures.length > 0
          ? `تم إغلاق ${closedCount} جلسة مع ${failures.length} أخطاء`
          : "تم إغلاق كل الجلسات المفتوحة وتنظيف غرف الفيديو";

    return success(
      res,
      {
        ended,
        cancelled,
        total: rows.length,
        failures,
        daily_rooms_deleted: dailyPurge.deleted?.length || 0,
        daily_rooms_failed: dailyPurge.failed?.length || 0
      },
      message
    );
  } catch (err) {
    return handleRouteError(res, err, "تعذر إغلاق الجلسات المفتوحة");
  }
});

router.post("/purge-daily-rooms", auth, checkRole("teacher", "admin"), async (req, res) => {
  try {
    if (!process.env.DAILY_API_KEY) {
      return error(res, "DAILY_API_KEY غير مضبوط على الخادم", 503);
    }
    const dailyPurge = await purgeSessionDailyRooms();
    return success(
      res,
      {
        deleted: dailyPurge.deleted?.length || 0,
        failed: dailyPurge.failed?.length || 0,
        room_names: dailyPurge.deleted || []
      },
      `تم حذف ${dailyPurge.deleted?.length || 0} غرفة فيديو من Daily`
    );
  } catch (err) {
    return handleRouteError(res, err, "تعذر تنظيف غرف Daily");
  }
});

router.post("/:id/enroll", auth, checkRole("student"), async (req, res) => {
  try {
    const { payment_id, payment_type, promo_code } = req.body;
    const sessionId = req.params.id;

    const studentProfileId = await getStudentProfileId(req.user.id);
    if (!studentProfileId) return error(res, "ملف الطالب غير موجود", 404);

    const session = await getSessionForEnroll(sessionId);
    if (!session) return error(res, "الجلسة غير موجودة", 404);
    if (session.status !== "scheduled") {
      return error(res, "لا يمكن التسجيل في جلسة غير متاحة", 400);
    }
    if (session.max_students > 0 && session.enrolled_count >= session.max_students) {
      return error(res, "الحصة ممتلئة", 400);
    }

    const existing = await checkExistingEnrollment(studentProfileId, sessionId, req.user.id);
    if (existing) {
      return success(
        res,
        mapCheckoutResponse({ enrollment: existing, checkout_url: null, paymob_url: null }),
        "مسجل بالفعل",
        200
      );
    }

    if (payment_id) {
      const { data: payment } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", payment_id)
        .eq("user_id", req.user.id)
        .maybeSingle();

      if (!payment) return error(res, "عملية الدفع غير موجودة", 404);

      if (payment.status !== "completed") {
        if (existing) return success(res, { enrollment: existing, checkout_url: null }, "مسجل بالفعل", 200);
        return error(res, "لم يكتمل الدفع بعد", 400);
      }
      if (payment.metadata?.session_id !== sessionId) {
        return error(res, "عملية الدفع لا تطابق هذه الجلسة", 400);
      }

      const result = await reconcileCompletedTransaction(payment);
      if (!result.enrolled && !result.duplicate) {
        if (result.reason === "session_full") return error(res, "الحصة ممتلئة", 400);
        return error(res, "فشل التسجيل", 400);
      }

      const { data: enrollment } = await supabase
        .from("session_enrollments")
        .select("*")
        .eq("session_id", sessionId)
        .eq("student_id", studentProfileId)
        .maybeSingle();

      return success(res, { enrollment, checkout_url: null }, "تم التسجيل", 201);
    }

    const type = normalizePaymentType(payment_type);
    const subjectId = await resolveSessionSubjectId(session);
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    if (type === "free_trial") {
      if (!subjectId) {
        return error(res, "لا يمكن استخدام الحصة المجانية لهذه الجلسة", 400);
      }
      const trialUsed = await checkFreeTrialUsed(req.user.id, session.teacher_id, subjectId);
      if (trialUsed) {
        return error(res, "استخدمت الحصة المجانية مع هذا المدرس", 400);
      }
      const enrollment = await finalizeFreeOrPromoEnrollment({
        userId: req.user.id,
        studentProfileId,
        session,
        subjectId,
        paymentType: "free_trial",
        promotionId: null,
        discountAmount: 0
      });
      return success(
        res,
        mapCheckoutResponse({ enrollment, checkout_url: null, paymob_url: null, success: true }),
        "تم التسجيل",
        201
      );
    }

    if (type === "subscription") {
      const sub = await getActiveSubscription(req.user.id);
      if (!sub || sub.sessions_remaining <= 0) {
        return error(res, "اشتراكك انتهت حصصه", 400);
      }
      await deductSubscriptionSession(sub.id);
      const enrollment = await confirmEnrollment({
        studentProfileId,
        sessionId,
        paymentId: null,
        userId: req.user.id
      });
      await notifyEnrollmentConfirm(req.user.id, sessionId, 0);
      return success(
        res,
        mapCheckoutResponse({ enrollment, checkout_url: null, paymob_url: null, success: true }),
        "تم التسجيل",
        201
      );
    }

    const checkout = await computeSessionCheckout(session, {
      promoCode: promo_code,
      userId: req.user.id,
      paymentType: "pay_per_session"
    });
    if (checkout.error) return error(res, checkout.error, 400);

    if (checkout.finalPrice <= 0) {
      const enrollment = await finalizeFreeOrPromoEnrollment({
        userId: req.user.id,
        studentProfileId,
        session,
        subjectId,
        paymentType: "pay_per_session",
        promotionId: checkout.promotionId,
        discountAmount: checkout.discountAmount
      });
      return success(
        res,
        mapCheckoutResponse({ enrollment, checkout_url: null, paymob_url: null, success: true }),
        "تم التسجيل",
        201
      );
    }

    const pay = await createSessionPaymentCheckout({
      user: req.user,
      session,
      finalPrice: checkout.finalPrice,
      originalPrice: checkout.originalPrice,
      discountAmount: checkout.discountAmount,
      promotionId: checkout.promotionId,
      frontendUrl,
      studentProfileId
    });

    return success(
      res,
      mapCheckoutResponse({
        success: true,
        enrollment: pay.enrollment || null,
        checkout_url: pay.checkout_url,
        paymob_url: pay.paymob_url,
        transaction_id: pay.transaction_id
      }),
      "تابع الدفع",
      201
    );
  } catch (err) {
    if (err.code === "session_full") return error(res, "الحصة ممتلئة", 400);
    return handleRouteError(res, err, "Failed to enroll");
  }
});

router.post("/:id/cancel-enrollment", auth, checkRole("student"), async (req, res) => {
  try {
    const result = await cancelStudentEnrollment(req.user.id, req.params.id);
    await safeInvalidateSessionCaches(req.params.id);
    return success(res, result, "تم إلغاء التسجيل");
  } catch (err) {
    return error(res, err.message || "تعذر إلغاء التسجيل", 400);
  }
});

router.post("/:id/start", auth, checkRole("teacher"), async (req, res) => {
  try {
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const scheduledSession = await fetchSessionForStart(req.params.id);
    if (!scheduledSession) return error(res, "الجلسة غير موجودة", 404);

    const startInfo = getSessionStartAvailability(scheduledSession);
    if (!startInfo.canStart) {
      return error(res, startInfo.reason || "لا يمكن بدء الجلسة الآن", 400);
    }

    let roomUrl = scheduledSession.daily_room_url || scheduledSession.room_url || null;
    let roomWarning = null;

    if (!roomUrl && process.env.DAILY_API_KEY) {
      const attached = await attachDailyRoomToSession(
        req.params.id,
        scheduledSession.title,
        scheduledSession.max_students || 10
      );
      roomUrl = attached?.daily_room_url || attached?.room_url || attached?.url || null;
    }

    if (!roomUrl) {
      roomWarning = process.env.DAILY_API_KEY
        ? "تم بدء الجلسة بدون رابط فيديو. راجع DAILY_API_KEY في Railway."
        : "تم بدء الجلسة بدون بث مباشر (DAILY_API_KEY غير مضبوط).";
    }

    const session = await markSessionLive(req.params.id);
    await safeInvalidateSessionCaches(req.params.id);

    return success(res, {
      room_url: session?.daily_room_url || session?.room_url || roomUrl,
      ...(roomWarning ? { room_warning: roomWarning } : {})
    });
  } catch (err) {
    return handleRouteError(res, err, "تعذر بدء الجلسة");
  }
});

router.post("/:id/end", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await getTeacherProfileForUser(req.user.id);
    if (!teacher) return error(res, "Teacher profile not found", 404);
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("daily_room_name, daily_room_url, room_url")
      .eq("id", req.params.id)
      .maybeSingle();

    await supabase
      .from("sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", req.params.id);

    await supabase
      .from("session_enrollments")
      .update({ status: "attended", left_at: new Date().toISOString() })
      .eq("session_id", req.params.id)
      .eq("status", "enrolled");

    await incrementAttendeeStreaks(req.params.id);
    const earning = await recordSessionEarnings(req.params.id, teacher.id, teacher.commission_rate);

    const roomName = resolveRoomName(sessionRow);
    if (roomName) await deleteDailyRoom(roomName);

    await safeInvalidateSessionCaches(req.params.id);
    return success(res, { teacher_id: teacher.id, earning }, "Session ended");
  } catch (err) {
    return handleRouteError(res, err, "Failed to end session");
  }
});

router.patch("/:id/cancel", auth, checkRole("teacher", "admin"), async (req, res) => {
  try {
    const { data: session, error: dbError } = await supabase
      .from("sessions")
      .select("status, teacher_id")
      .eq("id", req.params.id)
      .single();

    if (dbError) throw dbError;
    if (!session) return error(res, "الجلسة غير موجودة", 404);

    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.role === "teacher" && session.teacher_id === req.user.id;

    if (!isAdmin && !isOwner) {
      return error(res, "غير مصرح لك بإلغاء هذه الجلسة", 403);
    }

    if (session.status === "completed" || session.status === "cancelled") {
      return error(res, "لا يمكن إلغاء جلسة منتهية أو ملغاة", 400);
    }

    if (isOwner && session.status === "live") {
      const teacher = await getTeacherProfileForUser(req.user.id);
      if (!teacher) return error(res, "ملف المدرّس غير موجود", 404);

      const { data: sessionRow } = await supabase
        .from("sessions")
        .select("daily_room_name, daily_room_url, room_url")
        .eq("id", req.params.id)
        .maybeSingle();

      await supabase
        .from("sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", req.params.id);

      await supabase
        .from("session_enrollments")
        .update({ status: "attended", left_at: new Date().toISOString() })
        .eq("session_id", req.params.id)
        .eq("status", "enrolled");

      await incrementAttendeeStreaks(req.params.id);
      await recordSessionEarnings(req.params.id, teacher.id, teacher.commission_rate);

      const roomName = resolveRoomName(sessionRow);
      if (roomName) await deleteDailyRoom(roomName);
      await safeInvalidateSessionCaches(req.params.id);
      return success(res, {}, "تم إنهاء الجلسة المباشرة");
    }

    if (isOwner && session.status !== "scheduled") {
      return error(res, "يمكن إلغاء الجلسات المجدولة فقط", 400);
    }

    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("daily_room_name, daily_room_url, room_url")
      .eq("id", req.params.id)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (updateError) throw updateError;

    const roomName = resolveRoomName(sessionRow);
    if (roomName) await deleteDailyRoom(roomName);

    const refundResult = await refundAllSessionEnrollments(req.params.id);
    await safeInvalidateSessionCaches(req.params.id);
    return success(res, { refunds: refundResult.refunds }, "تم إلغاء الجلسة");
  } catch (err) {
    return handleRouteError(res, err, "تعذر إلغاء الجلسة");
  }
});

function canEnterLiveSession(session) {
  if (session.status === "cancelled") {
    return { ok: false, reason: "الحصة ملغية" };
  }
  if (session.status === "live") {
    return { ok: true };
  }
  const joinWindow = getSessionJoinWindow(session);
  if (!joinWindow.canJoin) {
    return { ok: false, reason: joinWindow.reason || "لا يمكن الدخول الآن" };
  }
  return { ok: true };
}

async function resolveRoomForSession(session, sessionId) {
  let roomName = resolveRoomName(session);
  let roomUrl = roomName ? getRoomUrl(roomName) : session.daily_room_url || session.room_url || null;

  if (!roomName && !roomUrl && process.env.DAILY_API_KEY) {
    const attached = await attachDailyRoomToSession(
      sessionId,
      session.title,
      session.max_students || 10
    );
    roomName = resolveRoomName(attached) || attached?.daily_room_name || null;
    roomUrl =
      attached?.daily_room_url ||
      attached?.room_url ||
      attached?.url ||
      (roomName ? getRoomUrl(roomName) : null);
  }

  return { roomName, roomUrl };
}

function dailyTokenFailureResponse(res, lastError) {
  if (lastError?.dailyError || lastError?.dailyInfo) {
    const mapped = mapDailyError(lastError);
    return error(res, mapped.message, mapped.status, {
      daily_error: lastError.dailyError,
      daily_info: lastError.dailyInfo
    });
  }
  return error(
    res,
    "تعذر إنشاء رمز الدخول لغرفة الفيديو. تحقق من DAILY_API_KEY في Railway (مفتاح Daily.co صالح لنفس النطاق).",
    502
  );
}

async function buildMeetingPayload(session, sessionId, reqUser, isTeacher) {
  const { roomName, roomUrl } = await resolveRoomForSession(session, sessionId);

  const access = await ensureDailyMeetingAccess({
    title: session.title,
    maxStudents: session.max_students || 10,
    roomName,
    roomUrl,
    userId: reqUser.id,
    isOwner: isTeacher,
    userName: reqUser.full_name || reqUser.email || ""
  });

  if (access.recreated) {
    await attachDailyRoomToSession(
      sessionId,
      session.title,
      session.max_students || 10,
      { url: access.roomUrl, name: access.roomName }
    );
  }

  return access;
}

async function assertStudentEnrollmentForJoin(userId, sessionId) {
  if (isSchemaV2()) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, status, payment_status")
      .eq("student_id", userId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!enrollment) return { ok: false, message: "غير مسجل في هذه الحصة" };
    const paid =
      enrollment.payment_status === "paid" ||
      SCHEMA.confirmedEnrollmentStatuses().includes(enrollment.status);
    if (!paid) return { ok: false, message: "غير مسجل في هذه الحصة" };
    return { ok: true };
  }

  const studentProfileId = await getStudentProfileId(userId);
  if (!studentProfileId) return { ok: false, message: "ملف الطالب غير موجود" };

  const { data: enrollment } = await supabase
    .from("session_enrollments")
    .select("id, status")
    .eq("student_id", studentProfileId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!enrollment || !SCHEMA.confirmedEnrollmentStatuses().includes(enrollment.status)) {
    return { ok: false, message: "غير مسجل في هذه الحصة" };
  }
  return { ok: true };
}

router.post("/:id/join", auth, async (req, res) => {
  try {
    const session = await fetchSessionForJoin(req.params.id);
    if (!session) return error(res, "الحصة غير موجودة", 404);

    const entry = canEnterLiveSession(session);
    if (!entry.ok) return error(res, entry.reason, 400);

    const isTeacher = session.teacher_id === req.user.id;
    if (!isTeacher && req.user.role === "student") {
      const access = await assertStudentEnrollmentForJoin(req.user.id, req.params.id);
      if (!access.ok) return error(res, access.message, 403);
    } else if (!isTeacher && req.user.role !== "admin") {
      return error(res, "غير مصرح لك بدخول هذه الجلسة", 403);
    }

    const access = await buildMeetingPayload(session, req.params.id, req.user, isTeacher);

    if (!access.roomUrl && !access.roomName) {
      return error(
        res,
        process.env.DAILY_API_KEY
          ? "غرفة الفيديو غير متاحة. راجع DAILY_API_KEY في Railway."
          : "غرفة الفيديو غير مفعّلة على الخادم (DAILY_API_KEY).",
        502
      );
    }

    if (!access.token) {
      return dailyTokenFailureResponse(res, access.lastError);
    }

    return success(res, {
      room_url: access.roomUrl,
      token: access.token,
      is_teacher: isTeacher,
      session_start: sessionStartTime(session)
    });
  } catch (err) {
    if (err?.dailyError) {
      const mapped = mapDailyError(err);
      return error(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, err, "تعذر الدخول إلى الحصة");
  }
});

router.get("/:id/room", auth, async (req, res) => {
  try {
    const session = await fetchSessionForJoin(req.params.id);
    if (!session) return error(res, "الجلسة غير موجودة", 404);

    const isTeacher = session.teacher_id === req.user.id;
    let allowed = isTeacher || req.user.role === "admin";

    if (!allowed && req.user.role === "student") {
      const access = await assertStudentEnrollmentForJoin(req.user.id, req.params.id);
      allowed = access.ok;
    }

    if (!allowed) return error(res, "غير مصرح لك بدخول هذه الجلسة", 403);

    const entry = canEnterLiveSession(session);
    if (!entry.ok) return error(res, entry.reason || "الجلسة ليست مباشرة الآن", 400);

    const access = await buildMeetingPayload(session, req.params.id, req.user, isTeacher);

    if (!access.roomUrl && !access.roomName) {
      return error(
        res,
        process.env.DAILY_API_KEY
          ? "غرفة الفيديو غير متاحة"
          : "غرفة الفيديو غير مفعّلة على الخادم",
        502
      );
    }

    if (!access.token) {
      return dailyTokenFailureResponse(res, access.lastError);
    }

    return success(res, {
      room_url: access.roomUrl,
      token: access.token,
      is_teacher: isTeacher
    });
  } catch (err) {
    if (err?.dailyError) {
      const mapped = mapDailyError(err);
      return error(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, err, "تعذر تحميل غرفة الفيديو");
  }
});

export default router;
