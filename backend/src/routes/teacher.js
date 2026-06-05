import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { CACHE, withCache } from "../lib/cache.js";
import { success, error } from "../utils/response.js";
import { fetchFullUserProfile, ensureUserProfile } from "../utils/ensure-user-profile.js";
import { normalizeSessionRow } from "../utils/session-select.js";
import { sessionStartTime } from "../lib/schema.js";
import {
  countTeacherSessions,
  getTeacherBalance,
  getTeacherProfile
} from "../services/teacher.service.js";

const router = Router();

function mapTeacherSession(row) {
  if (!row) return null;
  return normalizeSessionRow(row);
}

async function resolveTeacherContext(userId, reqUser) {
  let teacher = await getTeacherProfile(userId);
  if (!teacher) {
    await ensureUserProfile(supabase, {
      id: userId,
      email: reqUser?.email || "",
      full_name: reqUser?.full_name || "معلم",
      role: "teacher",
      phone: reqUser?.phone || null
    });
    teacher = await getTeacherProfile(userId);
  }
  return teacher;
}

router.get("/dashboard", auth, checkRole("teacher"), async (req, res) => {
  try {
    const payload = await withCache(
      CACHE.teacherDashboard(req.user.id),
      CACHE.TTL.teacherDashboard,
      async () => {
        const teacher = await resolveTeacherContext(req.user.id, req.user);
        if (!teacher) return null;

        const user = await fetchFullUserProfile(supabase, req.user.id);
        const nowIso = new Date().toISOString();

        const [
          scheduledCount,
          liveCount,
          completedCount,
          upcomingRes,
          completedRes,
          earningsSummary
        ] = await Promise.all([
          countTeacherSessions(req.user.id, "scheduled"),
          countTeacherSessions(req.user.id, "live"),
          countTeacherSessions(req.user.id, "completed"),
          supabase
            .from("sessions")
            .select("*")
            .eq("teacher_id", req.user.id)
            .eq("status", "scheduled")
            .gte("scheduled_at", nowIso)
            .order("scheduled_at", { ascending: true })
            .limit(6),
          supabase
            .from("sessions")
            .select("*")
            .eq("teacher_id", req.user.id)
            .eq("status", "completed")
            .order("scheduled_at", { ascending: false })
            .limit(5),
          getTeacherBalance(teacher.id)
        ]);

        const upcomingSessions = (upcomingRes.data || []).map(mapTeacherSession).filter(Boolean);
        const recentCompleted = (completedRes.data || []).map(mapTeacherSession).filter(Boolean);

        const tp = user?.teacher_profile || teacher;

        return {
          profile: {
            full_name: user?.full_name || req.user.full_name || "",
            avatar_url: user?.avatar_url || null,
            email: user?.email || req.user.email || "",
            commission_rate: Number(tp?.commission_rate ?? 70),
            rating: Number(tp?.rating ?? 5),
            review_count: Number(tp?.review_count ?? 0),
            bio: tp?.bio || null,
            subjects: tp?.subjects || []
          },
          stats: {
            scheduled_sessions: scheduledCount,
            live_sessions: liveCount,
            completed_sessions: completedCount,
            total_earnings: earningsSummary.total_earnings,
            available_balance: earningsSummary.available_balance
          },
          upcoming_sessions: upcomingSessions,
          recent_completed: recentCompleted,
          earnings_summary: earningsSummary
        };
      }
    );

    if (!payload) return error(res, "ملف المدرس غير موجود", 404);
    return success(res, payload);
  } catch (err) {
    console.error("[teacher] dashboard:", err?.message || err);
    return error(res, "تعذر تحميل لوحة المعلم", 500);
  }
});

router.get("/reviews", auth, checkRole("teacher"), async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));

    const { data: reviews, error: dbError } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, student:users!reviews_student_id_fkey(full_name)")
      .eq("teacher_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (dbError) {
      console.warn("[teacher] reviews join:", dbError.message);
      const fallback = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at")
        .eq("teacher_id", req.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (fallback.error) throw fallback.error;

      const { count } = await supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", req.user.id);

      const rows = fallback.data || [];
      const avg =
        rows.length > 0
          ? rows.reduce((s, r) => s + Number(r.rating || 0), 0) / rows.length
          : 0;

      return success(res, {
        reviews: rows.map((r) => ({
          ...r,
          student_name: "طالب"
        })),
        average_rating: Number(avg.toFixed(2)),
        total_count: count || rows.length
      });
    }

    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", req.user.id);

    const mapped = (reviews || []).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      student_name: r.student?.full_name || "طالب"
    }));

    const avg =
      mapped.length > 0
        ? mapped.reduce((s, r) => s + Number(r.rating || 0), 0) / mapped.length
        : 0;

    return success(res, {
      reviews: mapped,
      average_rating: Number(avg.toFixed(2)),
      total_count: count || mapped.length
    });
  } catch (err) {
    console.error("[teacher] reviews:", err?.message || err);
    return error(res, "تعذر تحميل التقييمات", 500);
  }
});

router.get("/analytics", auth, checkRole("teacher"), async (req, res) => {
  try {
    const teacher = await resolveTeacherContext(req.user.id, req.user);
    if (!teacher) return error(res, "ملف المدرس غير موجود", 404);

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [{ data: sessions }, { data: earnings }, { data: reviews }] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, subject, subject_id, scheduled_at, start_time, status")
        .eq("teacher_id", req.user.id)
        .gte("scheduled_at", fourWeeksAgo.toISOString()),
      supabase
        .from("teacher_earnings")
        .select("teacher_amount, created_at")
        .eq("teacher_id", teacher.id)
        .gte("created_at", sixMonthsAgo.toISOString()),
      supabase.from("reviews").select("rating").eq("teacher_id", req.user.id)
    ]);

    const weekBuckets = {};
    for (let i = 3; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = d.toISOString().slice(0, 10);
      weekBuckets[key] = { week: `أسبوع ${4 - i}`, sessions: 0 };
    }

    (sessions || []).forEach((s) => {
      const at = sessionStartTime(s) || s.scheduled_at;
      if (!at) return;
      const weekStart = new Date(at);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      const bucketKey = Object.keys(weekBuckets).find((k) => k <= key) || Object.keys(weekBuckets).pop();
      if (bucketKey && weekBuckets[bucketKey]) weekBuckets[bucketKey].sessions += 1;
    });

    const monthBuckets = {};
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets[key] = {
        month: d.toLocaleDateString("ar-EG", { month: "short", year: "numeric" }),
        earnings: 0
      };
    }

    (earnings || []).forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthBuckets[key]) monthBuckets[key].earnings += Number(e.teacher_amount || 0);
    });

    const { data: teacherSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("teacher_id", req.user.id);

    const sessionIds = (teacherSessions || []).map((s) => s.id);
    let enrollmentRows = [];
    if (sessionIds.length > 0) {
      const { data } = await supabase
        .from("session_enrollments")
        .select("student_id")
        .in("session_id", sessionIds);
      enrollmentRows = data || [];
    }

    const studentCounts = {};
    enrollmentRows.forEach((row) => {
      const sid = row.student_id;
      if (sid) studentCounts[sid] = (studentCounts[sid] || 0) + 1;
    });

    const uniqueStudents = Object.keys(studentCounts).length;
    const repeatStudents = Object.values(studentCounts).filter((c) => c > 1).length;

    const subjectCounts = {};
    (sessions || []).forEach((s) => {
      const label = typeof s.subject === "string" && s.subject.trim() ? s.subject : "أخرى";
      subjectCounts[label] = (subjectCounts[label] || 0) + 1;
    });

    const reviewRows = reviews || [];
    const avgRating =
      reviewRows.length > 0
        ? reviewRows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewRows.length
        : 0;

    return success(res, {
      sessions_per_week: Object.values(weekBuckets),
      earnings_per_month: Object.values(monthBuckets),
      unique_students: uniqueStudents,
      repeat_students: repeatStudents,
      retention_rate: uniqueStudents > 0 ? Math.round((repeatStudents / uniqueStudents) * 100) : 0,
      average_rating: Number(avgRating.toFixed(2)),
      subject_distribution: Object.entries(subjectCounts).map(([name, value]) => ({ name, value }))
    });
  } catch (err) {
    console.error("[teacher] analytics:", err?.message || err);
    return error(res, "تعذر تحميل التحليلات", 500);
  }
});

/** Session status tab counts for teacher sessions list */
router.get("/session-counts", auth, checkRole("teacher"), async (req, res) => {
  try {
    const statuses = ["all", "scheduled", "live", "completed", "cancelled"];
    const counts = {};

    await Promise.all(
      statuses.map(async (status) => {
        if (status === "all") {
          const { count } = await supabase
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("teacher_id", req.user.id);
          counts.all = count || 0;
        } else {
          counts[status] = await countTeacherSessions(req.user.id, status);
        }
      })
    );

    return success(res, counts);
  } catch (err) {
    return error(res, "تعذر تحميل إحصائيات الجلسات", 500);
  }
});

export default router;
