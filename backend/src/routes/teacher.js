import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { CACHE, withCache } from "../lib/cache.js";
import { success, error } from "../utils/response.js";
import { fetchFullUserProfile, ensureUserProfile } from "../utils/ensure-user-profile.js";
import { normalizeSessionRow } from "../utils/session-select.js";
import { sessionStartTime, SCHEMA } from "../lib/schema.js";
import {
  countTeacherSessions,
  getTeacherBalance,
  getTeacherProfile
} from "../services/teacher.service.js";
import { formatSubjectLabelAr } from "../lib/subjects.js";

const VALID_ANALYTICS_PERIODS = new Set(["month", "3months", "6months", "year"]);
const MAX_CUSTOM_ANALYTICS_MONTHS = 12;

function parseDateStartIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseDateEndIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function getAnalyticsPeriodConfig(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "3months") {
    start.setMonth(start.getMonth() - 2);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString(), bucketCount: 3 };
  }

  if (period === "6months") {
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString(), bucketCount: 6 };
  }

  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), endIso: end.toISOString(), bucketCount: 12 };
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString(), bucketCount: 1 };
}

function buildMonthlyBucketsFromRange(startIso, endIso) {
  const buckets = [];
  const cursor = new Date(startIso);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endIso);

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      month: cursor.toLocaleDateString("ar-EG", { month: "short", year: "numeric" })
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

function buildMonthlyBuckets(count) {
  const buckets = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      month: d.toLocaleDateString("ar-EG", { month: "short", year: "numeric" })
    });
  }
  return buckets;
}

function resolveTeacherAnalyticsRange(period, dateFrom, dateTo) {
  const hasFrom = Boolean(String(dateFrom || "").trim());
  const hasTo = Boolean(String(dateTo || "").trim());

  if (hasFrom || hasTo) {
    const startIso = hasFrom ? parseDateStartIso(dateFrom) : null;
    const endIso = hasTo
      ? parseDateEndIso(dateTo)
      : parseDateEndIso(new Date().toISOString().slice(0, 10));

    if (hasFrom && !startIso) {
      return { ok: false, status: 400, message: "تاريخ البداية غير صالح" };
    }
    if (hasTo && !parseDateEndIso(dateTo)) {
      return { ok: false, status: 400, message: "تاريخ النهاية غير صالح" };
    }
    if (startIso && endIso && new Date(startIso) > new Date(endIso)) {
      return { ok: false, status: 400, message: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" };
    }

    const effectiveStart =
      startIso ||
      (() => {
        const d = new Date(endIso);
        d.setMonth(d.getMonth() - 5, 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })();

    const monthBuckets = buildMonthlyBucketsFromRange(effectiveStart, endIso);
    if (monthBuckets.length > MAX_CUSTOM_ANALYTICS_MONTHS) {
      return {
        ok: false,
        status: 400,
        message: `الفترة المخصصة طويلة جداً (الحد الأقصى ${MAX_CUSTOM_ANALYTICS_MONTHS} شهراً)`
      };
    }

    return {
      ok: true,
      period: "custom",
      startIso: effectiveStart,
      endIso,
      monthBuckets,
      periodLabel: "فترة مخصصة"
    };
  }

  const normalizedPeriod = VALID_ANALYTICS_PERIODS.has(period) ? period : "6months";
  const { startIso, endIso, bucketCount } = getAnalyticsPeriodConfig(normalizedPeriod);
  const periodLabels = {
    month: "هذا الشهر",
    "3months": "آخر 3 شهور",
    "6months": "آخر 6 شهور",
    year: "هذا العام"
  };

  return {
    ok: true,
    period: normalizedPeriod,
    startIso,
    endIso,
    monthBuckets: buildMonthlyBuckets(bucketCount),
    periodLabel: periodLabels[normalizedPeriod] || periodLabels["6months"]
  };
}

function buildSessionTrendBuckets(startIso, endIso) {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const diffDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));

  if (diffDays <= 35) {
    const bucketCount = Math.min(5, Math.max(1, Math.ceil(diffDays / 7)));
    const buckets = [];
    const end = new Date(endIso);

    for (let i = bucketCount - 1; i >= 0; i -= 1) {
      const bucketEnd = new Date(end);
      bucketEnd.setDate(bucketEnd.getDate() - i * 7);
      bucketEnd.setHours(23, 59, 59, 999);

      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() - 6);
      bucketStart.setHours(0, 0, 0, 0);

      if (bucketStart.getTime() < startMs) {
        bucketStart.setTime(startMs);
      }

      buckets.push({
        key: bucketStart.toISOString().slice(0, 10),
        label: bucketStart.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
        sessions: 0,
        from: bucketStart.getTime(),
        to: bucketEnd.getTime()
      });
    }
    return buckets;
  }

  return buildMonthlyBucketsFromRange(startIso, endIso).map((b) => ({
    key: b.key,
    label: b.month,
    sessions: 0,
    from: new Date(`${b.key}-01T00:00:00`).getTime(),
    to: (() => {
      const d = new Date(`${b.key}-01T00:00:00`);
      d.setMonth(d.getMonth() + 1);
      d.setMilliseconds(-1);
      return d.getTime();
    })()
  }));
}

function assignSessionToTrendBucket(buckets, atIso) {
  const atMs = new Date(atIso).getTime();
  if (Number.isNaN(atMs)) return;
  const bucket = buckets.find((b) => atMs >= b.from && atMs <= b.to);
  if (bucket) bucket.sessions += 1;
}

async function loadEnrollmentsForSessions(sessionIds) {
  if (!sessionIds.length) return [];
  const table = SCHEMA.enrollmentsTable();
  let query = supabase.from(table).select("student_id, session_id").in("session_id", sessionIds);
  const statuses = SCHEMA.confirmedEnrollmentStatuses?.();
  if (statuses?.length) {
    query = query.in("status", statuses);
  }
  const { data, error: dbError } = await query;
  if (dbError) throw dbError;
  return data || [];
}

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

    const period = String(req.query.period || "6months");
    const dateFrom = req.query.from ? String(req.query.from).trim() : "";
    const dateTo = req.query.to ? String(req.query.to).trim() : "";

    const range = resolveTeacherAnalyticsRange(period, dateFrom, dateTo);
    if (!range.ok) {
      return error(res, range.message, range.status);
    }

    const { startIso, endIso, monthBuckets, periodLabel } = range;

    const [
      { data: sessions, error: sessionsError },
      { data: earnings, error: earningsError },
      { data: reviews, error: reviewsError }
    ] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, subject, subject_id, scheduled_at, start_time, status")
        .eq("teacher_id", req.user.id)
        .gte("scheduled_at", startIso)
        .lte("scheduled_at", endIso),
      supabase
        .from("teacher_earnings")
        .select("teacher_amount, created_at")
        .eq("teacher_id", teacher.id)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      supabase
        .from("reviews")
        .select("rating, created_at")
        .eq("teacher_id", req.user.id)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
    ]);

    if (sessionsError) throw sessionsError;
    if (earningsError) throw earningsError;
    if (reviewsError) throw reviewsError;

    const sessionRows = sessions || [];
    const sessionTrendBuckets = buildSessionTrendBuckets(startIso, endIso);

    sessionRows.forEach((s) => {
      const at = sessionStartTime(s) || s.scheduled_at;
      if (!at) return;
      assignSessionToTrendBucket(sessionTrendBuckets, at);
    });

    const earningsBuckets = Object.fromEntries(
      monthBuckets.map((item) => [item.key, { month: item.month, earnings: 0 }])
    );

    (earnings || []).forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (earningsBuckets[key]) {
        earningsBuckets[key].earnings += Number(e.teacher_amount || 0);
      }
    });

    const periodSessionIds = sessionRows.map((s) => s.id).filter(Boolean);
    const enrollmentRows = await loadEnrollmentsForSessions(periodSessionIds);

    const studentCounts = {};
    enrollmentRows.forEach((row) => {
      const sid = row.student_id;
      if (sid) studentCounts[sid] = (studentCounts[sid] || 0) + 1;
    });

    const uniqueStudents = Object.keys(studentCounts).length;
    const repeatStudents = Object.values(studentCounts).filter((c) => c > 1).length;

    const subjectCounts = {};
    sessionRows.forEach((s) => {
      const label = formatSubjectLabelAr(
        typeof s.subject === "string" && s.subject.trim() ? s.subject : "general"
      );
      subjectCounts[label] = (subjectCounts[label] || 0) + 1;
    });

    const reviewRows = reviews || [];
    const avgRating =
      reviewRows.length > 0
        ? reviewRows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewRows.length
        : 0;

    const completedSessions = sessionRows.filter((s) => s.status === "completed").length;
    const totalEarnings = (earnings || []).reduce((sum, e) => sum + Number(e.teacher_amount || 0), 0);

    return success(res, {
      period: range.period,
      period_label: periodLabel,
      sessions_trend: sessionTrendBuckets.map(({ label, sessions: count }) => ({
        label,
        sessions: count
      })),
      earnings_per_month: Object.values(earningsBuckets),
      unique_students: uniqueStudents,
      repeat_students: repeatStudents,
      retention_rate: uniqueStudents > 0 ? Math.round((repeatStudents / uniqueStudents) * 100) : 0,
      average_rating: Number(avgRating.toFixed(2)),
      review_count: reviewRows.length,
      completed_sessions: completedSessions,
      total_sessions: sessionRows.length,
      total_earnings: totalEarnings,
      subject_distribution: Object.entries(subjectCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
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
