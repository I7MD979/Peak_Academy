import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { createDailyRoom } from "../services/daily.service.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { isSchemaError, mapDbError, SQL_SETUP_HINT } from "../utils/db-errors.js";
import { querySessionById, querySessionsList } from "../utils/session-select.js";
import { ensureUserProfile } from "../utils/ensure-user-profile.js";
import { incrementAttendeeStreaks, recordSessionEarnings } from "../utils/session-earnings.js";

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
  const { data: session } = await supabase.from("sessions").select("teacher_id").eq("id", sessionId).single();
  if (!session) {
    error(res, "Session not found", 404);
    return null;
  }
  if (session.teacher_id !== userId) {
    error(res, "Not authorized for this session", 403);
    return null;
  }
  return session;
}

function handleRouteError(res, err, fallbackMessage) {
  const mapped = mapDbError(err);
  if (process.env.NODE_ENV !== "production") {
    console.error(fallbackMessage, err);
  }
  return error(res, mapped.message || fallbackMessage, mapped.status);
}

router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, subject, grade, status = "scheduled", search } = req.query;
    const { from, to } = paginate(page, limit);
    const ascending = status === "completed" || status === "cancelled" ? false : true;

    const { data, count, db_warning } = await querySessionsList((query) => {
      let q = query.range(from, to);

      if (req.user.role === "teacher") {
        q = q.eq("teacher_id", req.user.id);
      }

      if (status && status !== "all") {
        q = q.eq("status", status);
      }

      q = q.order("scheduled_at", { ascending });

      if (grade) q = q.eq("grade", grade);
      if (search) {
        const term = String(search).trim();
        if (term) q = q.ilike("title", `%${term}%`);
      }

      // subject_id may be missing until RUN_IN_SQL_EDITOR.sql is applied
      if (subject) {
        q = q.eq("subject_id", subject);
      }

      return q;
    });

    if (db_warning) {
      res.setHeader("X-Peak-Db-Warning", "schema");
    }
    return paginated(res, data, paginationMeta(count, Number(page), Number(limit)), {
      ...(db_warning ? { warning: SQL_SETUP_HINT } : {})
    });
  } catch (err) {
    const pageNum = Number(req.query.page) || 1;
    const limitNum = Number(req.query.limit) || 20;
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /sessions", err);
    }
    return paginated(res, [], paginationMeta(0, pageNum, limitNum), {
      warning: SQL_SETUP_HINT
    });
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
    const session = await querySessionById(req.params.id, (q) => {
      if (req.user.role === "teacher") {
        return q.eq("teacher_id", req.user.id);
      }
      return q;
    });

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
    const teacher = await getTeacherProfileForUser(req.user.id);
    if (!teacher) return error(res, "Teacher profile not found", 404);

    const roomUrl = await createDailyRoom(req.body.title);
    const { data: session, error: dbError } = await supabase
      .from("sessions")
      .insert({
        id: `s-${Date.now()}`,
        teacher_id: req.user.id,
        title: req.body.title,
        subject: req.body.subject || "general",
        grade: req.body.grade || "third",
        scheduled_at: req.body.scheduled_at,
        duration_min: req.body.duration_min || 60,
        max_students: req.body.max_students || 10,
        price_per_student: req.body.price_per_student,
        subject_id: req.body.subject_id || null,
        description: req.body.description || null,
        daily_room_url: roomUrl,
        status: "scheduled"
      })
      .select()
      .single();
    if (dbError) throw dbError;
    return success(res, session, "Session created", 201);
  } catch (err) {
    return handleRouteError(res, err, "Failed to create session");
  }
});

router.post("/:id/enroll", auth, checkRole("student"), async (req, res) => {
  try {
    const { payment_id } = req.body;
    if (!payment_id) return error(res, "payment_id is required", 400);

    const { data: student } = await supabase.from("student_profiles").select("id").eq("user_id", req.user.id).single();
    if (!student) return error(res, "Student profile not found", 404);

    const { data: payment } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", payment_id)
      .eq("user_id", req.user.id)
      .single();

    if (!payment || payment.status !== "completed") {
      return error(res, "Payment not completed", 400);
    }
    if (payment.metadata?.session_id !== req.params.id) {
      return error(res, "Payment does not match this session", 400);
    }

    const { data: existing } = await supabase
      .from("session_enrollments")
      .select("id")
      .eq("session_id", req.params.id)
      .eq("student_id", student.id)
      .maybeSingle();

    if (existing) return error(res, "Already enrolled in this session", 400);

    const { data: session } = await supabase.from("sessions").select("max_students").eq("id", req.params.id).single();
    if (!session) return error(res, "Session not found", 404);

    const { count: enrolledCount } = await supabase
      .from("session_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("session_id", req.params.id)
      .in("status", ["enrolled", "attended"]);

    if (enrolledCount >= session.max_students) return error(res, "Session is full", 400);

    const { data: enrollment, error: dbError } = await supabase
      .from("session_enrollments")
      .insert({
        id: `en-${Date.now()}`,
        session_id: req.params.id,
        student_id: student.id,
        payment_id,
        status: "enrolled"
      })
      .select()
      .single();
    if (dbError) throw dbError;
    return success(res, enrollment, "Enrolled successfully", 201);
  } catch (err) {
    return handleRouteError(res, err, "Failed to enroll");
  }
});

router.post("/:id/start", auth, checkRole("teacher"), async (req, res) => {
  try {
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

    const { data: session, error: dbError } = await supabase
      .from("sessions")
      .update({ status: "live" })
      .eq("id", req.params.id)
      .select("daily_room_url,room_url")
      .single();
    if (dbError) throw dbError;

    return success(res, { room_url: session.daily_room_url || session.room_url });
  } catch (err) {
    return handleRouteError(res, err, "Failed to start session");
  }
});

router.post("/:id/end", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await getTeacherProfileForUser(req.user.id);
    if (!teacher) return error(res, "Teacher profile not found", 404);
    if (!(await assertTeacherOwnsSession(req.params.id, req.user.id, res))) return;

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

    return success(res, { teacher_id: teacher.id, earning }, "Session ended");
  } catch (err) {
    return handleRouteError(res, err, "Failed to end session");
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
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

    if (isOwner && session.status !== "scheduled") {
      return error(res, "يمكن إلغاء الجلسات المجدولة فقط", 400);
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (updateError) throw updateError;
    return success(res, null, "تم إلغاء الجلسة");
  } catch (err) {
    return handleRouteError(res, err, "تعذر إلغاء الجلسة");
  }
});

router.get("/:id/room", auth, async (req, res) => {
  try {
    const { data: session, error: dbError } = await supabase
      .from("sessions")
      .select(
        "daily_room_url,room_url,status,teacher_id,enrollments:session_enrollments(student:student_profiles(user_id))"
      )
      .eq("id", req.params.id)
      .single();

    if (dbError) throw dbError;
    if (!session) return error(res, "الجلسة غير موجودة", 404);
    if (session.status !== "live") return error(res, "الجلسة ليست مباشرة الآن", 400);

    const isTeacher = session.teacher_id === req.user.id;
    const isEnrolled = (session.enrollments || []).some((e) => e.student?.user_id === req.user.id);
    if (!isTeacher && !isEnrolled) return error(res, "غير مصرح لك بدخول هذه الجلسة", 403);

    return success(res, {
      room_url: session.daily_room_url || session.room_url,
      is_teacher: isTeacher
    });
  } catch (err) {
    return handleRouteError(res, err, "Failed to get room");
  }
});

export default router;
