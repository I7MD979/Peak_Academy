import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error } from "../utils/response.js";
import {
  enrichSessions,
  normalizeSessionRow,
  querySessionById
} from "../utils/session-select.js";
import { ensureUserProfile, isRoleProfileComplete } from "../utils/ensure-user-profile.js";
import { getEnrollmentOptionsForSession, getSessionForEnroll } from "../services/enrollmentService.js";
import { countPaidSessionEnrollments } from "../services/subscriptionService.js";
import { getActiveSubscription } from "../services/enrollmentService.js";
import { CACHE, withCache } from "../lib/cache.js";
import { isSchemaV2, SCHEMA } from "../lib/schema.js";

const SESSION_SELECT = "*";

const router = Router();

const GRADE_LABELS = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي"
};

function mapSessionRow(session, { isEnrolled = false, enrollmentStatus = null } = {}) {
  if (!session) return null;

  const base = normalizeSessionRow(session);
  const enrolled = base.enrollment_count ?? base.enrollments?.[0]?.count ?? 0;
  const max = base.max_students ?? 0;
  const subjectObj = base.subject && typeof base.subject === "object" ? base.subject : null;

  return {
    ...base,
    is_enrolled: isEnrolled,
    enrollment_status: enrollmentStatus,
    teacher_name: base.teacher?.full_name || "مدرس",
    subject_name: base.subject_name || subjectObj?.name_ar || "مادة",
    subject_icon: subjectObj?.icon || null,
    grade_label: GRADE_LABELS[session.grade] || session.grade,
    enrollment_count: enrolled,
    is_full: max > 0 && enrolled >= max
  };
}

async function getStudentContext(userId) {
  let { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("id, grade, section, streak_days, link_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError || !student) {
    const { data: userRow } = await supabase
      .from("users")
      .select("email, full_name, phone, role")
      .eq("id", userId)
      .maybeSingle();
    if (userRow?.role === "student") {
      await ensureUserProfile(supabase, {
        id: userId,
        email: userRow.email,
        full_name: userRow.full_name,
        role: "student",
        phone: userRow.phone
      });
      const retry = await supabase
        .from("student_profiles")
        .select("id, grade, section, streak_days, link_code")
        .eq("user_id", userId)
        .maybeSingle();
      student = retry.data;
      studentError = retry.error;
    }
  }

  if (studentError || !student) return null;

  const { data: user } = await supabase
    .from("users")
    .select("full_name, avatar_url, email, phone")
    .eq("id", userId)
    .single();

  const enrollTable = SCHEMA.enrollmentsTable();
  const studentKey = isSchemaV2() ? userId : student.id;
  const { data: enrollmentRows } = await supabase
    .from(enrollTable)
    .select("session_id, status")
    .eq("student_id", studentKey);

  const enrollmentMap = {};
  const enrolledIds = [];

  for (const row of enrollmentRows || []) {
    enrollmentMap[row.session_id] = row.status;
    enrolledIds.push(row.session_id);
  }

  return { student, user, enrollmentMap, enrolledIds };
}

function formatIdInList(ids) {
  return `(${ids.map((id) => `"${id}"`).join(",")})`;
}

function excludeEnrolledIds(query, enrolledIds) {
  if (enrolledIds.length === 0) return query;
  return query.not("id", "in", formatIdInList(enrolledIds));
}

function applyAvailableFilters(query, { student, enrolledIds, onlyMyGrade, subject, maxPrice }) {
  const now = new Date().toISOString();
  query = query.eq("status", "scheduled").gte("scheduled_at", now).order("scheduled_at", { ascending: true });

  if (onlyMyGrade !== "false" && student.grade) {
    query = query.eq("grade", student.grade);
  }

  if (subject) {
    query = query.eq("subject", subject);
  }

  if (maxPrice) {
    query = query.lte("price_per_student", maxPrice);
  }

  if (enrolledIds.length > 0) {
    query = excludeEnrolledIds(query, enrolledIds);
  }

  return query;
}

async function countAvailableSessions(ctx, queryParams, userId) {
  const { total } = await fetchAvailableSessionsPage(
    ctx,
    {
      ...queryParams,
      page: 1,
      limit: 1
    },
    userId
  );
  return total;
}

async function fetchAvailableSessionsPage(ctx, queryParams, userId) {
  const { student, enrolledIds } = ctx;
  const {
    page = 1,
    limit = 12,
    search = "",
    only_my_grade = "true",
    subject = "",
    max_price = ""
  } = queryParams;
  const maxPrice = max_price ? Number(max_price) : null;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;
  const batchSize = Math.max(limitNum * 3, 36);
  let dbOffset = 0;
  const nonFull = [];

  while (dbOffset < 2000) {
    let query = supabase.from("sessions").select(SESSION_SELECT);
    query = applyAvailableFilters(query, {
      student,
      enrolledIds,
      onlyMyGrade: only_my_grade,
      subject: subject || null,
      maxPrice: maxPrice && maxPrice > 0 ? maxPrice : null
    });

    if (search) {
      const term = String(search).trim();
      if (term) query = query.ilike("title", `%${term}%`);
    }

    const { data, error: dbError } = await query.range(dbOffset, dbOffset + batchSize - 1);
    if (dbError) throw dbError;
    if (!data?.length) break;

    const enriched = await enrichSessions(data);
    for (const session of enriched) {
      const row = mapSessionRow(session, { isEnrolled: false, enrollmentStatus: null });
      if (!row.is_full) {
        const opts = await getEnrollmentOptionsForSession(userId, {
          ...session,
          enrolled_count: row.enrollment_count,
          seats_left: Math.max(0, (row.max_students || 0) - (row.enrollment_count || 0))
        });
        nonFull.push({
          ...row,
          free_trial_available: opts.free_trial_available,
          active_subscription: opts.active_subscription,
          seats_left: opts.seats_left,
          low_seats: opts.low_seats
        });
      }
    }

    dbOffset += batchSize;
    if (data.length < batchSize) break;
  }

  return {
    sessions: nonFull.slice(skip, skip + limitNum),
    total: nonFull.length
  };
}

router.get("/profile", auth, checkRole("student"), async (req, res) => {
  try {
    const ctx = await getStudentContext(req.user.id);
    if (!ctx) {
      return success(res, {
        full_name: "",
        email: req.user.email || "",
        phone: req.user.phone || "",
        avatar_url: null,
        grade: null,
        grade_label: null,
        section: null,
        streak_days: 0,
        link_code: null,
        profile_complete: false,
        stats: {
          streak_days: 0,
          enrolled_upcoming: 0,
          completed_sessions: 0,
          questions_total: 0,
          questions_answered: 0
        }
      });
    }

    const { student, user, enrolledIds } = ctx;

    const enrollTable = SCHEMA.enrollmentsTable();
    const studentKey = isSchemaV2() ? req.user.id : student.id;
    const { data: enrollmentDetails } = await supabase
      .from(enrollTable)
      .select("id, status, session:sessions(status, scheduled_at, start_time)")
      .eq("student_id", studentKey);

    const now = Date.now();
    const enrollments = enrollmentDetails || [];
    const upcomingCount = enrollments.filter(
      (row) =>
        row.session?.status === "scheduled" &&
        new Date(row.session.scheduled_at).getTime() >= now
    ).length;
    const completedCount = enrollments.filter((row) => row.session?.status === "completed").length;

    const [{ count: questionsTotal }, { count: questionsAnswered }] = await Promise.all([
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", req.user.id),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", req.user.id)
        .eq("status", "answered")
    ]);

    return success(res, {
      full_name: user?.full_name || "",
      email: user?.email || req.user.email || "",
      phone: user?.phone || req.user.phone || "",
      avatar_url: user?.avatar_url || null,
      grade: student.grade,
      grade_label: GRADE_LABELS[student.grade] || student.grade,
      section: student.section,
      streak_days: student.streak_days || 0,
      link_code: student.link_code,
      profile_complete: isRoleProfileComplete("student", {
        student_profile: student,
        teacher_profile: null
      }),
      stats: {
        streak_days: student.streak_days || 0,
        enrolled_upcoming: upcomingCount,
        completed_sessions: completedCount,
        questions_total: questionsTotal || 0,
        questions_answered: questionsAnswered || 0,
        enrolled_sessions: enrolledIds.length
      }
    });
  } catch (_err) {
    return error(res, "تعذر تحميل الملف الشخصي", 500);
  }
});

router.get("/dashboard", auth, checkRole("student"), async (req, res) => {
  try {
    const payload = await withCache(
      CACHE.studentDashboard(req.user.id),
      CACHE.TTL.studentDashboard,
      async () => {
    const ctx = await getStudentContext(req.user.id);
    if (!ctx) return null;

    const { student, user, enrollmentMap, enrolledIds } = ctx;
    const enrollTable = SCHEMA.enrollmentsTable();
    const studentKey = isSchemaV2() ? req.user.id : student.id;

    const { data: enrollmentDetails } = await supabase
      .from(enrollTable)
      .select(`id, status, session:sessions(${SESSION_SELECT})`)
      .eq("student_id", studentKey);

    const enrolledSessions = (enrollmentDetails || [])
      .map((row) => mapSessionRow(row.session, { isEnrolled: true, enrollmentStatus: row.status }))
      .filter(Boolean);

    const now = Date.now();
    const liveSessions = enrolledSessions.filter((s) => s.status === "live");
    const upcomingSessions = enrolledSessions
      .filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const completedCount = enrolledSessions.filter((s) => s.status === "completed").length;

    let recommendedQuery = supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(8);

    if (student.grade) recommendedQuery = recommendedQuery.eq("grade", student.grade);
    if (enrolledIds.length > 0) recommendedQuery = excludeEnrolledIds(recommendedQuery, enrolledIds);

    const { data: recommendedRaw } = await recommendedQuery;
    const recommendedEnriched = await enrichSessions(recommendedRaw || []);
    const recommendedSessions = recommendedEnriched
      .map((session) => mapSessionRow(session, { isEnrolled: false }))
      .filter((session) => session && !session.is_full)
      .slice(0, 4);

    return {
      profile: {
        full_name: user?.full_name || "",
        avatar_url: user?.avatar_url || null,
        grade: student.grade,
        grade_label: GRADE_LABELS[student.grade] || student.grade,
        section: student.section,
        streak_days: student.streak_days || 0,
        link_code: student.link_code
      },
      stats: {
        streak_days: student.streak_days || 0,
        enrolled_upcoming: upcomingSessions.length,
        live_now: liveSessions.length,
        completed_sessions: completedCount,
        recommended_count: recommendedSessions.length
      },
      live_sessions: liveSessions,
      upcoming_sessions: upcomingSessions.slice(0, 4),
      recommended_sessions: recommendedSessions
    };
      }
    );

    if (!payload) return error(res, "ملف الطالب غير موجود", 404);
    return success(res, payload);
  } catch (_err) {
    return error(res, "تعذر تحميل لوحة الطالب", 500);
  }
});

router.get("/sessions", auth, checkRole("student"), async (req, res) => {
  try {
    const ctx = await getStudentContext(req.user.id);
    if (!ctx) return error(res, "ملف الطالب غير موجود", 404);

    const { student, enrollmentMap, enrolledIds } = ctx;
    const {
      page = 1,
      limit = 12,
      tab = "available",
      search = "",
      only_my_grade = "true",
      subject = "",
      max_price = ""
    } = req.query;
    const maxPrice = max_price ? Number(max_price) : null;
    const { from, to } = paginate(page, limit);

    let query = supabase.from("sessions").select(SESSION_SELECT, { count: "exact" });

    const emptyPayload = (tabCounts) =>
      success(res, {
        sessions: [],
        pagination: paginationMeta(0, Number(page), Number(limit)),
        tab_counts: tabCounts,
        grade_label: GRADE_LABELS[student.grade] || student.grade
      });

    if (tab === "mine") {
      if (enrolledIds.length === 0) {
        return emptyPayload({ available: 0, mine: 0, live: 0, completed: 0 });
      }
      query = query.in("id", enrolledIds).order("scheduled_at", { ascending: false });
    } else if (tab === "live") {
      query = query.eq("status", "live").order("scheduled_at", { ascending: true });
      if (enrolledIds.length > 0) {
        query = query.in("id", enrolledIds);
      } else {
        return emptyPayload({ available: 0, mine: 0, live: 0, completed: 0 });
      }
    } else if (tab === "completed") {
      if (enrolledIds.length === 0) {
        return emptyPayload({ available: 0, mine: 0, live: 0, completed: 0 });
      }
      query = query.in("id", enrolledIds).eq("status", "completed").order("scheduled_at", { ascending: false });
    } else {
      query = applyAvailableFilters(query, {
        student,
        enrolledIds,
        onlyMyGrade: only_my_grade,
        subject: subject || null,
        maxPrice: maxPrice && maxPrice > 0 ? maxPrice : null
      });
    }

    if (tab !== "available" && subject) {
      query = query.eq("subject", subject);
    }
    if (tab !== "available" && maxPrice && maxPrice > 0) {
      query = query.lte("price_per_student", maxPrice);
    }

    if (search) {
      const term = String(search).trim();
      if (term) query = query.ilike("title", `%${term}%`);
    }

    let sessions = [];
    let totalForPagination = 0;

    if (tab === "available") {
      const available = await fetchAvailableSessionsPage(ctx, req.query, req.user.id);
      sessions = available.sessions;
      totalForPagination = available.total;
    } else {
      query = query.range(from, to);

      const { data, count, error: dbError } = await query;
      if (dbError) throw dbError;

      const enriched = await enrichSessions(data || []);
      sessions = enriched.map((session) => {
        const isEnrolled = enrolledIds.includes(session.id);
        return mapSessionRow(session, {
          isEnrolled,
          enrollmentStatus: enrollmentMap[session.id] || null
        });
      });

      totalForPagination = count;
    }

    const tabCounts = {
      available: 0,
      mine: enrolledIds.length,
      live: 0,
      completed: 0
    };

    const [availableTotal, liveCountRes, completedCountRes] = await Promise.all([
      tab === "available"
        ? Promise.resolve(totalForPagination)
        : countAvailableSessions(ctx, req.query, req.user.id),
      enrolledIds.length
        ? supabase
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("status", "live")
            .in("id", enrolledIds)
        : Promise.resolve({ count: 0 }),
      enrolledIds.length
        ? supabase
            .from("sessions")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .in("id", enrolledIds)
        : Promise.resolve({ count: 0 })
    ]);

    tabCounts.available = availableTotal;
    tabCounts.live = liveCountRes.count || 0;
    tabCounts.completed = completedCountRes.count || 0;

    if (tab !== "available") {
      totalForPagination = totalForPagination || 0;
    }

    return success(res, {
      sessions,
      pagination: paginationMeta(totalForPagination, Number(page), Number(limit)),
      tab_counts: tabCounts,
      grade_label: GRADE_LABELS[student.grade] || student.grade
    });
  } catch (_err) {
    return error(res, "تعذر تحميل الجلسات", 500);
  }
});

router.get("/sessions/:id", auth, checkRole("student"), async (req, res) => {
  try {
    const ctx = await getStudentContext(req.user.id);
    if (!ctx) return error(res, "ملف الطالب غير موجود", 404);

    const { enrollmentMap, enrolledIds } = ctx;

    const normalized = await querySessionById(req.params.id);
    if (!normalized) return error(res, "الجلسة غير موجودة", 404);
    const isEnrolled = enrolledIds.includes(normalized.id);
    const enrollmentStatus = enrollmentMap[normalized.id] || null;
    const enrolledCount = normalized.enrollment_count ?? normalized.enrollments?.[0]?.count ?? 0;
    const maxStudents = normalized.max_students ?? 0;
    const isFull = maxStudents > 0 && enrolledCount >= maxStudents;
    const isPast = new Date(normalized.scheduled_at).getTime() < Date.now();

    const canEnroll =
      !isEnrolled && normalized.status === "scheduled" && !isFull && !isPast;
    const canJoinLive = isEnrolled && normalized.status === "live";

    const enrollOpts = await getEnrollmentOptionsForSession(req.user.id, {
      ...normalized,
      teacher_id: normalized.teacher_id,
      enrolled_count: enrolledCount,
      seats_left: Math.max(0, maxStudents - enrolledCount)
    });

    const paidSessions = await countPaidSessionEnrollments(req.user.id);
    const subscription = await getActiveSubscription(req.user.id);

    return success(res, {
      ...mapSessionRow(normalized, { isEnrolled, enrollmentStatus }),
      description: normalized.description,
      duration_min: normalized.duration_min,
      max_students: maxStudents,
      can_enroll: canEnroll,
      can_join_live: canJoinLive,
      is_full: isFull,
      ...enrollOpts,
      paid_session_count: paidSessions,
      show_subscription_cta: paidSessions >= 3 && !subscription
    });
  } catch (_err) {
    return error(res, "تعذر تحميل تفاصيل الجلسة", 500);
  }
});

router.get("/enrollment-options", auth, checkRole("student"), async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return error(res, "معرّف الجلسة مطلوب", 400);

    const session = await getSessionForEnroll(session_id);
    if (!session) return error(res, "الجلسة غير موجودة", 404);

    const options = await getEnrollmentOptionsForSession(req.user.id, session);
    const paidSessions = await countPaidSessionEnrollments(req.user.id);

    return success(res, {
      session_id,
      ...options,
      paid_session_count: paidSessions,
      show_subscription_cta: paidSessions >= 3 && !options.active_subscription
    });
  } catch (err) {
    return error(res, err.message || "تعذر تحميل خيارات التسجيل", 500);
  }
});

export default router;
