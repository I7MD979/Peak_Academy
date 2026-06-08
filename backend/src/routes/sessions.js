import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import {
  deleteLiveKitRoom,
  purgeSessionLiveKitRooms,
  ensureSessionLiveKitRoomOptional,
  ensureLiveKitAccess,
  getLiveKitServerUrl,
  getRoomUrl,
  isLiveKitConfigured,
  mapLiveKitError,
  muteAllParticipantsInRoom,
  resolveRoomName,
  sessionLiveKitRoomName
} from "../services/livekit.service.js";
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
import { allowSchema } from "../middleware/allowlist.js";
import { enrollmentLimiter, listLimiter, enforcePagination } from "../middleware/resourceLimits.js";
import { enrollmentVelocity, detectSuspiciousActivity } from "../middleware/businessRules.js";
import {
  clampSessionDuration,
  fetchSessionForJoin,
  fetchSessionForStart,
  isMissingColumnError,
  markSessionLive
} from "../utils/session-db.js";
import {
  isStudentWaitingConnected,
  pruneWaitingPresence,
  recordWaitingHeartbeat
} from "../utils/session-waiting-presence.js";
import { querySessionEnrollmentsForTeacher } from "../utils/session-enrollments.js";
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

const SESSION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateSessionId(req, res, next) {
  if (!SESSION_UUID_RE.test(req.params.id)) {
    return error(res, "معرّف الجلسة غير صالح", 400);
  }
  next();
}

const createSessionSchema = z.object({
  title: z.string().min(3, "عنوان الجلسة قصير جداً").max(200),
  subject: z.string().min(1, "المادة مطلوبة").max(100),
  grade: z
    .enum([
      "prep_first",
      "prep_second",
      "prep_third",
      "sec_first",
      "sec_second",
      "sec_third"
    ])
    .optional(),
  school_level: z.enum(["preparatory", "secondary"]).optional(),
  scheduled_at: z.string().min(1, "موعد الجلسة مطلوب"),
  duration_min: z.coerce.number().int().min(15).max(240).optional(),
  max_students: z.coerce.number().int().min(2, "الحد الأدنى طالبان").max(100).optional(),
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
  const mapped = err?.livekitError ? mapLiveKitError(err) : mapDbError(err);
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

async function clearSessionLiveKitRoomFields(sessionId) {
  const patchVariants = [
    { daily_room_url: null, daily_room_name: null, room_url: null },
    { room_url: null }
  ];
  for (const patch of patchVariants) {
    const { error: dbError } = await supabase.from("sessions").update(patch).eq("id", sessionId);
    if (!dbError) return;
    if (!isMissingColumnError(dbError)) break;
  }
}

async function deleteSessionLiveKitRoom(sessionRow) {
  const roomName = resolveRoomName(sessionRow) || sessionLiveKitRoomName(sessionRow?.id);
  if (roomName) await deleteLiveKitRoom(roomName);
}

async function detachLiveKitRoomFromSession(sessionId, sessionRow) {
  await deleteSessionLiveKitRoom(sessionRow);
  await clearSessionLiveKitRoomFields(sessionId);
}

async function attachLiveKitRoomToSession(sessionId, maxStudents, existingRoom = null) {
  const room =
    existingRoom ||
    (await ensureSessionLiveKitRoomOptional(sessionId, {
      maxStudents,
      expiryHours: 3
    }));
  if (!room) return null;

  const serverUrl = getLiveKitServerUrl();
  const patchVariants = [
    { daily_room_url: serverUrl, daily_room_name: room.name, room_url: serverUrl },
    { daily_room_name: room.name, room_url: serverUrl },
    { room_url: serverUrl }
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
      console.warn("[sessions] attach livekit room:", dbError.message);
      break;
    }
  }
  return room;
}

router.get("/", auth, listLimiter, enforcePagination, async (req, res) => {
  try {
    if (req.user.role === "student") {
      return error(res, "استخدم /api/student/sessions لعرض الجلسات", 403);
    }
    if (req.user.role === "parent") {
      return error(res, "غير مصرح لك بعرض الجلسات", 403);
    }

    const { page = 1, limit = 20, subject, grade, status = "scheduled", search, school_level, scheduled_from, scheduled_to } =
      req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const { from, to } = paginate(page, safeLimit);
    const ascending = status === "completed" || status === "cancelled" ? false : true;
    const validStatuses = ["all", "scheduled", "live", "completed", "cancelled"];
    const safeStatus = validStatuses.includes(String(status)) ? String(status) : "scheduled";

    let teacherIdsForSearch = [];
    if (search && req.user.role === "admin") {
      const term = String(search)
        .trim()
        .replace(/[%_,]/g, "");
      if (term) {
        const { data: teachers } = await supabase
          .from("users")
          .select("id")
          .eq("role", "teacher")
          .ilike("full_name", `%${term}%`);
        teacherIdsForSearch = (teachers || []).map((t) => t.id);
      }
    }

    const cacheKey = CACHE.sessionsList({
      page: Number(page),
      limit: safeLimit,
      subject: subject || null,
      grade: grade || null,
      status: safeStatus || "scheduled",
      search: search || null,
      school_level: school_level || null,
      scheduled_from: scheduled_from || null,
      scheduled_to: scheduled_to || null,
      role: req.user.role,
      userId: req.user.role === "teacher" ? req.user.id : null
    });

    const cached = await withCache(cacheKey, CACHE.TTL.sessionsList, async () => {
      const { data, count, db_warning } = await querySessionsList((query, orderColumn, opts = {}) => {
        let q = query.range(from, to);

        if (req.user.role === "teacher") {
          q = q.eq("teacher_id", req.user.id);
        }

        if (safeStatus && safeStatus !== "all") {
          q = q.eq("status", safeStatus);
        }

        q = q.order(orderColumn, { ascending });

        if (grade) q = q.eq("grade", grade);
        if (school_level && ["preparatory", "secondary"].includes(String(school_level))) {
          q = q.eq("school_level", school_level);
        }

        const scheduleColumn = orderColumn === "start_time" ? "start_time" : "scheduled_at";
        if (scheduled_from) {
          const fromDate = new Date(String(scheduled_from));
          if (!Number.isNaN(fromDate.getTime())) {
            q = q.gte(scheduleColumn, fromDate.toISOString());
          }
        }
        if (scheduled_to) {
          const toDate = new Date(String(scheduled_to));
          if (!Number.isNaN(toDate.getTime())) {
            toDate.setHours(23, 59, 59, 999);
            q = q.lte(scheduleColumn, toDate.toISOString());
          }
        }

        if (search) {
          const term = String(search)
            .trim()
            .replace(/[%_,]/g, "");
          if (term) {
            if (req.user.role === "admin" && teacherIdsForSearch.length) {
              q = q.or(`title.ilike.%${term}%,teacher_id.in.(${teacherIdsForSearch.join(",")})`);
            } else {
              q = q.ilike("title", `%${term}%`);
            }
          }
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
    const { page: pageNum, limit: limitNum } = paginate(page, safeLimit);

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

router.get("/:id/waiting-students", auth, checkRole("teacher", "admin"), validateSessionId, async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("sessions")
      .select("id, teacher_id, title, status")
      .eq("id", req.params.id)
      .single();

    if (!session) return error(res, "الجلسة غير موجودة", 404);

    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.role === "teacher" && session.teacher_id === req.user.id;
    if (!isAdmin && !isOwner) {
      return error(res, "غير مصرح لك بعرض طلاب هذه الجلسة", 403);
    }

    pruneWaitingPresence();

    const enrollments = await querySessionEnrollmentsForTeacher(supabase, req.params.id, {
      activeOnly: true
    });

    const students = enrollments
      .map((row) => {
        const userId = row.student_user_id;
        return {
          studentId: userId,
          name: row.student_name,
          avatar: row.student_avatar_url,
          isConnected: userId ? isStudentWaitingConnected(req.params.id, userId) : false
        };
      })
      .filter((row) => row.studentId);

    return success(res, { students, connected_count: students.filter((s) => s.isConnected).length });
  } catch (err) {
    return handleRouteError(res, err, "تعذر تحميل قائمة الانتظار");
  }
});

router.post("/:id/waiting-heartbeat", auth, checkRole("student"), validateSessionId, async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!session) return error(res, "الجلسة غير موجودة", 404);
    if (session.status === "completed" || session.status === "cancelled") {
      return error(res, "الجلسة غير متاحة", 400);
    }

    recordWaitingHeartbeat(req.params.id, req.user.id);
    return success(res, { ok: true });
  } catch (err) {
    return handleRouteError(res, err, "تعذر تسجيل الحضور في غرفة الانتظار");
  }
});

router.get("/:id/enrollments", auth, checkRole("teacher", "admin"), validateSessionId, async (req, res) => {
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

    const enrollments = await querySessionEnrollmentsForTeacher(supabase, req.params.id);

    return success(res, { session, enrollments });
  } catch (err) {
    return handleRouteError(res, err, "تعذر تحميل الطلاب المسجلين");
  }
});

router.get("/:id", auth, validateSessionId, async (req, res) => {
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

router.post("/", auth, checkRole("teacher"), allowSchema("sessionCreate"), async (req, res) => {
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
    if (scheduledAt.getTime() <= Date.now() + 5 * 60 * 1000) {
      return error(res, "موعد الجلسة يجب أن يكون بعد 5 دقائق على الأقل", 400);
    }

    const maxStudents = body.max_students || 10;
    let roomWarning = null;

    if (isLiveKitConfigured()) {
      roomWarning = "سيتم إنشاء غرفة الفيديو عند بدء الجلسة.";
    } else {
      roomWarning = "غرفة الفيديو غير مفعّلة (LIVEKIT_* غير مضبوط على الخادم).";
    }

    const sessionUuid = crypto.randomUUID();
    const insertPayload = {
      id: sessionUuid,
      teacher_id: req.user.id,
      title: body.title,
      subject: body.subject || "general",
      grade: body.grade || "sec_third",
      school_level: body.school_level || "secondary",
      scheduled_at: scheduledAt.toISOString(),
      duration_min: clampSessionDuration(body.duration_min),
      max_students: maxStudents,
      price_per_student: body.price_per_student,
      subject_id: body.subject_id || null,
      description: body.description || null,
      daily_room_url: null,
      daily_room_name: null,
      room_url: null,
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
      ? "تم إنشاء الجلسة. غرفة الفيديو تُنشأ عند الضغط على «بدء الجلسة»."
      : "تم إنشاء الجلسة بنجاح";

    return success(
      res,
      { ...session, ...(roomWarning ? { room_warning: roomWarning } : {}) },
      message,
      201
    );
  } catch (err) {
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
    try {
      await detachLiveKitRoomFromSession(session.id, session);
    } catch (roomErr) {
      console.warn("[sessions] livekit room cleanup skipped:", session.id, roomErr?.message);
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
      .select("id, status, teacher_id, daily_room_name, daily_room_url, room_url")
      .in("status", ["live", "scheduled"])
      .limit(500);

    if (req.user.role === "teacher") {
      query = query.eq("teacher_id", req.user.id);
    }

    const { data: allSessions, error: listError } = await query;
    if (listError) throw listError;

    const rows = allSessions || [];

    let ended = 0;
    let cancelled = 0;
    const failures = [];

    for (const session of rows) {
      try {
        const result = await closeOneOpenSessionRow(session);
        if (result === "ended") ended += 1;
        else cancelled += 1;

        await detachLiveKitRoomFromSession(session.id, session);
        await safeInvalidateSessionCaches(session.id);
      } catch (err) {
        failures.push({ id: session.id, message: err?.message || "فشل الإغلاق" });
      }
    }

    let livekitPurge = { deleted: [], failed: [], skipped: true };
    try {
      livekitPurge = await purgeSessionLiveKitRooms();
    } catch (purgeErr) {
      console.warn("[sessions] livekit purge:", purgeErr?.message || purgeErr);
      livekitPurge = { deleted: [], failed: [], skipped: true, error: purgeErr?.message };
    }

    await invalidatePattern("sessions:list:");

    const closedCount = ended + cancelled;
    const message =
      rows.length === 0 && (livekitPurge.deleted?.length || 0) === 0
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
        livekit_rooms_deleted: livekitPurge.deleted?.length || 0,
        livekit_rooms_failed: livekitPurge.failed?.length || 0,
        daily_rooms_deleted: livekitPurge.deleted?.length || 0,
        daily_rooms_failed: livekitPurge.failed?.length || 0
      },
      message
    );
  } catch (err) {
    return handleRouteError(res, err, "تعذر إغلاق الجلسات المفتوحة");
  }
});

router.post("/purge-daily-rooms", auth, checkRole("teacher", "admin"), async (req, res) => {
  try {
    if (!isLiveKitConfigured()) {
      return error(res, "LIVEKIT غير مضبوط على الخادم", 503);
    }
    const livekitPurge = await purgeSessionLiveKitRooms();
    return success(
      res,
      {
        deleted: livekitPurge.deleted?.length || 0,
        failed: livekitPurge.failed?.length || 0,
        room_names: livekitPurge.deleted || []
      },
      `تم حذف ${livekitPurge.deleted?.length || 0} غرفة فيديو من LiveKit`
    );
  } catch (err) {
    return handleRouteError(res, err, "تعذر تنظيف غرف LiveKit");
  }
});

router.post("/:id/mute-all", auth, checkRole("teacher"), validateSessionId, async (req, res) => {
  try {
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const roomName = sessionLiveKitRoomName(req.params.id);
    const result = await muteAllParticipantsInRoom(roomName);
    return success(res, result, `تم كتم ${result.muted} مسار صوتي`);
  } catch (err) {
    return handleRouteError(res, err, "تعذر كتم المشاركين");
  }
});

router.post(
  "/:id/enroll",
  auth,
  checkRole("student"),
  validateSessionId,
  enrollmentLimiter,
  enrollmentVelocity,
  detectSuspiciousActivity,
  allowSchema("enrollSession"),
  async (req, res) => {
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

router.post("/:id/cancel-enrollment", auth, checkRole("student"), validateSessionId, async (req, res) => {
  try {
    const result = await cancelStudentEnrollment(req.user.id, req.params.id);
    await safeInvalidateSessionCaches(req.params.id);
    return success(res, result, "تم إلغاء التسجيل");
  } catch (err) {
    const isProd = process.env.NODE_ENV === "production";
    const msg = !isProd && err.message ? err.message : "تعذر إلغاء التسجيل";
    return error(res, msg, 400);
  }
});

router.post("/:id/start", auth, checkRole("teacher"), validateSessionId, async (req, res) => {
  try {
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const scheduledSession = await fetchSessionForStart(req.params.id);
    if (!scheduledSession) return error(res, "الجلسة غير موجودة", 404);

    const startInfo = getSessionStartAvailability(scheduledSession);
    if (!startInfo.canStart) {
      return error(res, startInfo.reason || "لا يمكن بدء الجلسة الآن", 400);
    }

    let roomUrl = scheduledSession.daily_room_url || scheduledSession.room_url || getLiveKitServerUrl();
    let roomWarning = null;

    if (isLiveKitConfigured()) {
      const existingName = resolveRoomName(scheduledSession);
      if (!existingName) {
        await attachLiveKitRoomToSession(req.params.id, scheduledSession.max_students || 10);
      }
      roomUrl = getLiveKitServerUrl();
    }

    if (!roomUrl) {
      roomWarning = isLiveKitConfigured()
        ? "تم بدء الجلسة بدون رابط فيديو. راجع LIVEKIT_* في Railway."
        : "تم بدء الجلسة بدون بث مباشر (LiveKit غير مضبوط).";
    }

    const session = await markSessionLive(req.params.id);
    await safeInvalidateSessionCaches(req.params.id);

    try {
      const { enqueueJob } = await import("../lib/queue.js");
      const { data: enrollmentRows } = await supabase
        .from("session_enrollments")
        .select("student:student_profiles(user_id)")
        .eq("session_id", req.params.id)
        .eq("status", "enrolled");

      await Promise.all(
        (enrollmentRows || [])
          .map((row) => row.student?.user_id)
          .filter(Boolean)
          .map((studentUserId) =>
            enqueueJob("notifications", "push-notification", {
              userId: studentUserId,
              type: "session_live",
              title: "حصتك بدأت الآن",
              body: `${scheduledSession.title || "الجلسة"} مباشرة — انضم الآن`,
              data: { session_id: req.params.id }
            })
          )
      );
    } catch (notifyErr) {
      console.warn("[sessions] start notifications skipped:", notifyErr?.message || notifyErr);
    }

    return success(res, {
      room_url: session?.daily_room_url || session?.room_url || roomUrl,
      ...(roomWarning ? { room_warning: roomWarning } : {})
    });
  } catch (err) {
    return handleRouteError(res, err, "تعذر بدء الجلسة");
  }
});

router.post("/:id/end", auth, checkRole("teacher"), validateSessionId, async (req, res) => {
  try {
    const teacher = await getTeacherProfileForUser(req.user.id);
    if (!teacher) return error(res, "Teacher profile not found", 404);
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("id, daily_room_name, daily_room_url, room_url")
      .eq("id", req.params.id)
      .maybeSingle();

    const endedAt = new Date().toISOString();

    await deleteSessionLiveKitRoom(sessionRow || { id: req.params.id });

    await supabase
      .from("sessions")
      .update({
        status: "completed",
        ended_at: endedAt,
        daily_room_name: null,
        daily_room_url: null,
        room_url: null
      })
      .eq("id", req.params.id);

    await supabase
      .from("session_enrollments")
      .update({ status: "attended", left_at: endedAt })
      .eq("session_id", req.params.id)
      .eq("status", "enrolled");

    await incrementAttendeeStreaks(req.params.id);
    const earning = await recordSessionEarnings(req.params.id, teacher.id, teacher.commission_rate);

    await safeInvalidateSessionCaches(req.params.id);
    return success(res, { teacher_id: teacher.id, earning }, "Session ended");
  } catch (err) {
    return handleRouteError(res, err, "Failed to end session");
  }
});

router.patch("/:id/cancel", auth, checkRole("teacher", "admin"), validateSessionId, async (req, res) => {
  try {
    const sessionId = req.params.id;

    const { data: session, error: dbError } = await supabase
      .from("sessions")
      .select("status, teacher_id")
      .eq("id", sessionId)
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
        .select("id, daily_room_name, daily_room_url, room_url")
        .eq("id", req.params.id)
        .maybeSingle();

      const endedAt = new Date().toISOString();
      await deleteSessionLiveKitRoom(sessionRow || { id: req.params.id });

      await supabase
        .from("sessions")
        .update({
          status: "completed",
          ended_at: endedAt,
          daily_room_name: null,
          daily_room_url: null,
          room_url: null
        })
        .eq("id", req.params.id);

      await supabase
        .from("session_enrollments")
        .update({ status: "attended", left_at: endedAt })
        .eq("session_id", req.params.id)
        .eq("status", "enrolled");

      await incrementAttendeeStreaks(req.params.id);
      await recordSessionEarnings(req.params.id, teacher.id, teacher.commission_rate);
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

    await detachLiveKitRoomFromSession(req.params.id, sessionRow);

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

function liveKitTokenFailureResponse(res, lastError) {
  if (lastError) {
    const mapped = mapLiveKitError(lastError);
    return error(res, mapped.message, mapped.status);
  }
  return error(
    res,
    "تعذر إنشاء رمز الدخول لغرفة الفيديو. تحقق من LIVEKIT_API_KEY و LIVEKIT_API_SECRET في Railway.",
    502
  );
}

async function buildMeetingPayload(session, sessionId, reqUser, isTeacher) {
  const access = await ensureLiveKitAccess({
    sessionId,
    maxStudents: session.max_students || 10,
    userId: reqUser.id,
    isTeacher,
    userName: reqUser.full_name || reqUser.email || ""
  });

  if (access.roomName) {
    await attachLiveKitRoomToSession(sessionId, session.max_students || 10, {
      name: access.roomName,
      url: access.roomUrl
    });
  }

  return {
    roomUrl: access.roomUrl,
    roomName: access.roomName,
    token: access.token,
    lastError: access.lastError
  };
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

router.post("/:id/join", auth, validateSessionId, async (req, res) => {
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
        isLiveKitConfigured()
          ? "غرفة الفيديو غير متاحة. راجع LIVEKIT_* في Railway."
          : "غرفة الفيديو غير مفعّلة على الخادم (LiveKit).",
        502
      );
    }

    if (!access.token) {
      return liveKitTokenFailureResponse(res, access.lastError);
    }

    return success(res, {
      room_url: access.roomUrl,
      token: access.token,
      is_teacher: isTeacher,
      session_start: sessionStartTime(session)
    });
  } catch (err) {
    return handleRouteError(res, err, "تعذر الدخول إلى الحصة");
  }
});

router.get("/:id/room", auth, validateSessionId, async (req, res) => {
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
        isLiveKitConfigured() ? "غرفة الفيديو غير متاحة" : "غرفة الفيديو غير مفعّلة على الخادم",
        502
      );
    }

    if (!access.token) {
      return liveKitTokenFailureResponse(res, access.lastError);
    }

    return success(res, {
      room_url: access.roomUrl,
      token: access.token,
      is_teacher: isTeacher
    });
  } catch (err) {
    return handleRouteError(res, err, "تعذر تحميل غرفة الفيديو");
  }
});

export default router;
