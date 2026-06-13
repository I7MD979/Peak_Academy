import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error } from "../utils/response.js";
import {
  enrichSessions,
  normalizeSessionRow,
  querySessionById,
  querySessionsRange,
  scheduleFilterColumn,
  sessionPriceColumn,
  SESSION_LIST_COLUMNS
} from "../utils/session-select.js";
import { buildLinkCode, ensureUserProfile, isRoleProfileComplete } from "../utils/ensure-user-profile.js";
import {
  getEnrollmentOptionsForSession,
  getSessionForEnroll,
  getActiveSubscription,
  resolveSessionSubjectId
} from "../services/enrollmentService.js";
import { getSessionPrice as getPlatformSessionPrice } from "../services/platformConfig.service.js";
import { countPaidSessionEnrollments } from "../services/subscriptionService.js";
import { CACHE, invalidateStudentCaches, withCache } from "../lib/cache.js";
import { isSchemaV2, SCHEMA } from "../lib/schema.js";
import { getSessionJoinWindow } from "../utils/session-join.js";
import { applyGradeFilter, isValidGrade } from "../lib/grades.js";
import { SUBJECT_LABELS_AR } from "../lib/subjects.js";

const SESSION_SELECT = SESSION_LIST_COLUMNS;

const router = Router();

const GRADE_LABELS = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي",
  prep_first: "الأول الإعدادي",
  prep_second: "الثاني الإعدادي",
  prep_third: "الثالث الإعدادي",
  sec_first: "الأول الثانوي",
  sec_second: "الثاني الثانوي",
  sec_third: "الثالث الثانوي"
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

const DEFAULT_STUDENT_STATS = {
  streak_days: 0,
  completed_sessions: 0,
  enrolled_upcoming: 0,
  questions_total: 0,
  questions_answered: 0
};

async function fetchStudentStats(userId, studentRow = null) {
  try {
    const { data, error: rpcError } = await supabase.rpc("get_student_stats", { p_user_id: userId });
    if (!rpcError && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return { ...DEFAULT_STUDENT_STATS, ...parsed };
    }
  } catch {
    /* fall through */
  }

  const streak = studentRow?.streak_days || 0;
  const [{ count: questionsTotal }, { count: questionsAnswered }] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("student_id", userId),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("status", "answered")
  ]);

  return {
    ...DEFAULT_STUDENT_STATS,
    streak_days: streak,
    questions_total: questionsTotal || 0,
    questions_answered: questionsAnswered || 0
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

function applyAvailableFilters(
  query,
  {
    student,
    enrolledIds,
    onlyMyGrade,
    subject,
    maxPrice,
    schoolLevel,
    dateFrom,
    dateTo,
    orderColumn = "scheduled_at",
    priceColumn = "price_per_student",
    hasSchoolLevelColumn = true
  }
) {
  const scheduleCol = scheduleFilterColumn(orderColumn);
  const now = new Date().toISOString();
  query = query.eq("status", "scheduled").gte(scheduleCol, now).order(orderColumn, { ascending: true });

  if (onlyMyGrade !== "false" && student.grade) {
    query = applyGradeFilter(query, student.grade);
  }

  if (schoolLevel && hasSchoolLevelColumn) {
    query = query.eq("school_level", schoolLevel);
  }

  if (subject) {
    query = query.eq("subject", subject);
  }

  if (maxPrice) {
    query = query.lte(priceColumn, maxPrice);
  }

  if (dateFrom) {
    query = query.gte(scheduleCol, dateFrom);
  }

  if (dateTo) {
    query = query.lte(scheduleCol, dateTo);
  }

  if (enrolledIds.length > 0) {
    query = excludeEnrolledIds(query, enrolledIds);
  }

  return query;
}

const VALID_SESSION_TABS = new Set(["available", "mine", "live", "completed"]);
const VALID_SUBJECT_KEYS = Object.keys(SUBJECT_LABELS_AR);

function parseScheduledDateRange(fromRaw, toRaw) {
  const result = { from: null, to: null, invalid: false };
  if (fromRaw) {
    const fromDate = new Date(String(fromRaw));
    if (Number.isNaN(fromDate.getTime())) {
      result.invalid = true;
      return result;
    }
    result.from = fromDate.toISOString();
  }
  if (toRaw) {
    const toDate = new Date(String(toRaw));
    if (Number.isNaN(toDate.getTime())) {
      result.invalid = true;
      return result;
    }
    toDate.setHours(23, 59, 59, 999);
    result.to = toDate.toISOString();
  }
  if (result.from && result.to && result.from > result.to) {
    result.invalid = true;
  }
  return result;
}

function applyScheduledDateRange(query, { from, to }) {
  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);
  return query;
}

async function resolveSubjectIdsForSessions(sessions) {
  const map = new Map();
  await Promise.all(
    (sessions || []).map(async (session) => {
      map.set(session.id, await resolveSessionSubjectId(session));
    })
  );
  return map;
}

function applyAvailableEnrollmentOptions(row, session, ctx, subjectId) {
  const trialUsed = subjectId ? ctx.trialUsed.has(`${session.teacher_id}:${subjectId}`) : true;
  const seatsLeft =
    row.seats_left ?? Math.max(0, (row.max_students || 0) - (row.enrollment_count || 0));
  return {
    ...row,
    free_trial_available: Boolean(subjectId) && !trialUsed && ctx.price > 0,
    active_subscription: ctx.subscription
      ? {
          id: ctx.subscription.id,
          sessions_remaining: ctx.subscription.sessions_remaining,
          plan_name: ctx.subscription.plan?.name
        }
      : null,
    seats_left: seatsLeft,
    low_seats: seatsLeft > 0 && seatsLeft <= 3
  };
}

async function countAvailableSessions(ctx, queryParams, userId) {
  const filterKey = JSON.stringify({
    only_my_grade: queryParams.only_my_grade ?? "true",
    subject: queryParams.subject || "",
    max_price: queryParams.max_price || "",
    school_level: queryParams.school_level || "",
    from: queryParams.from || "",
    to: queryParams.to || "",
    search: queryParams.search || ""
  });
  return withCache(
    CACHE.studentSessions(userId, `available-count:${filterKey}`),
    CACHE.TTL.studentSessions,
    async () => {
      const { total } = await fetchAvailableSessionsPage(
        ctx,
        { ...queryParams, page: 1, limit: 1 },
        userId
      );
      return total;
    }
  );
}

async function fetchAvailableSessionsPage(ctx, queryParams, userId) {
  const { student, enrolledIds } = ctx;
  const {
    page = 1,
    limit = 12,
    search = "",
    only_my_grade = "true",
    subject = "",
    max_price = "",
    school_level = "",
    from: fromRaw = "",
    to: toRaw = ""
  } = queryParams;
  const maxPrice = max_price ? Number(max_price) : null;
  const dateRange = parseScheduledDateRange(fromRaw, toRaw);
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;
  const batchSize = Math.max(limitNum * 3, 36);
  let dbOffset = 0;
  const nonFull = [];

  const [subscription, price, trialRes] = await Promise.all([
    getActiveSubscription(userId),
    getPlatformSessionPrice().catch(() => Number(process.env.SESSION_PRICE || 80)),
    supabase.from("free_trial_uses").select("teacher_id, subject_id").eq("student_id", userId)
  ]);
  const enrollCtx = {
    subscription,
    price,
    trialUsed: new Set((trialRes.data || []).map((r) => `${r.teacher_id}:${r.subject_id}`))
  };

  while (dbOffset < 2000) {
    const { data, error: dbError } = await querySessionsRange(
      (query, orderColumn, opts = {}) => {
        let next = applyAvailableFilters(query, {
          student,
          enrolledIds,
          onlyMyGrade: only_my_grade,
          subject: subject || null,
          maxPrice: maxPrice && maxPrice > 0 ? maxPrice : null,
          schoolLevel: school_level || null,
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
          orderColumn,
          priceColumn: sessionPriceColumn(orderColumn),
          hasSchoolLevelColumn: Boolean(opts.columns?.includes("school_level"))
        });

        if (search) {
          const term = String(search).trim();
          if (term) next = next.ilike("title", `%${term}%`);
        }

        return next;
      },
      { from: dbOffset, to: dbOffset + batchSize - 1 }
    );

    if (dbError) throw dbError;
    if (!data?.length) break;

    const subjectIds = await resolveSubjectIdsForSessions(data);
    for (const session of data) {
      const row = mapSessionRow(session, { isEnrolled: false, enrollmentStatus: null });
      if (!row || row.is_full) continue;
      nonFull.push(
        applyAvailableEnrollmentOptions(row, session, enrollCtx, subjectIds.get(session.id))
      );
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
    const userId = req.user.id;
    const ctx = await getStudentContext(userId);
    const [stats, subRes] = await Promise.all([
      fetchStudentStats(userId, ctx?.student),
      getActiveSubscription(userId).catch(() => null)
    ]);

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
        subscription: subRes,
        stats
      });
    }

    const { student, user, enrolledIds } = ctx;

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
      subscription: subRes,
      stats: {
        ...stats,
        enrolled_sessions: enrolledIds.length
      }
    });
  } catch (_err) {
    return error(res, "تعذر تحميل الملف الشخصي", 500);
  }
});

router.put("/profile", auth, checkRole("student"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, avatar_url, grade, section } = req.body || {};
    const userUpdates = {};

    if (full_name !== undefined) {
      const name = String(full_name || "").trim();
      if (name.length < 2) return error(res, "الاسم قصير جدًا", 400);
      if (name.length > 80) return error(res, "الاسم طويل جداً (80 حرفاً كحد أقصى)", 400);
      userUpdates.full_name = name;
    }
    if (phone !== undefined) {
      const phoneValue = String(phone || "").trim();
      if (phoneValue && phoneValue.length < 8) return error(res, "رقم الهاتف غير صالح", 400);
      if (phoneValue && phoneValue.length > 20) return error(res, "رقم الهاتف طويل جداً", 400);
      userUpdates.phone = phoneValue || null;
    }
    if (avatar_url !== undefined) {
      const url = String(avatar_url || "").trim();
      if (url && !/^https?:\/\/.+/i.test(url)) {
        return error(res, "رابط الصورة الشخصية غير صالح", 400);
      }
      if (url.length > 500) return error(res, "رابط الصورة الشخصية طويل جداً", 400);
      userUpdates.avatar_url = url || null;
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase.from("users").update(userUpdates).eq("id", userId);
      if (userError) throw userError;
    }

    const studentUpdates = {};
    if (grade !== undefined && grade !== null && grade !== "") {
      const gradeValue = String(grade).trim();
      if (!isValidGrade(gradeValue)) {
        return error(res, "الصف الدراسي غير صالح", 400);
      }
      studentUpdates.grade = gradeValue;
    }
    if (section !== undefined) {
      const sectionValue = String(section || "").trim();
      if (sectionValue.length > 50) return error(res, "اسم الشعبة طويل جدًا", 400);
      studentUpdates.section = sectionValue || null;
    }

    if (Object.keys(studentUpdates).length > 0) {
      const { data: existingStudent } = await supabase
        .from("student_profiles")
        .select("id, link_code")
        .eq("user_id", userId)
        .maybeSingle();

      const { error: studentError } = await supabase.from("student_profiles").upsert(
        {
          user_id: userId,
          link_code: existingStudent?.link_code || buildLinkCode(userId),
          ...studentUpdates
        },
        { onConflict: "user_id" }
      );
      if (studentError) throw studentError;
    }

    await invalidateStudentCaches(userId);

    const ctx = await getStudentContext(userId);
    const stats = await fetchStudentStats(userId, ctx?.student);

    return success(
      res,
      {
        full_name: ctx?.user?.full_name || userUpdates.full_name || "",
        email: ctx?.user?.email || req.user.email || "",
        phone: ctx?.user?.phone ?? userUpdates.phone ?? null,
        avatar_url: ctx?.user?.avatar_url ?? userUpdates.avatar_url ?? null,
        grade: ctx?.student?.grade ?? studentUpdates.grade ?? null,
        grade_label: GRADE_LABELS[ctx?.student?.grade || studentUpdates.grade] || null,
        section: ctx?.student?.section ?? studentUpdates.section ?? null,
        link_code: ctx?.student?.link_code || null,
        profile_complete: isRoleProfileComplete("student", {
          student_profile: ctx?.student,
          teacher_profile: null
        }),
        stats
      },
      "تم حفظ التغييرات"
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("PUT /student/profile", err);
    }
    return error(res, "تعذر تحديث الملف", 500);
  }
});

router.get("/dashboard", auth, checkRole("student"), async (req, res) => {
  try {
    const payload = await withCache(
      CACHE.studentDashboard(req.user.id),
      CACHE.TTL.studentDashboard,
      async () => {
        const userId = req.user.id;
        const ctx = await getStudentContext(userId);
        if (!ctx) return null;

        const { student, user, enrolledIds } = ctx;
        const enrollTable = SCHEMA.enrollmentsTable();
        const studentKey = isSchemaV2() ? userId : student.id;

        let recommendedQuery = supabase
          .from("sessions")
          .select(SESSION_SELECT)
          .eq("status", "scheduled")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(8);

        if (student.grade) recommendedQuery = applyGradeFilter(recommendedQuery, student.grade);
        if (enrolledIds.length > 0) recommendedQuery = excludeEnrolledIds(recommendedQuery, enrolledIds);

        const [{ data: enrollmentDetails }, { data: recommendedRaw }, stats] = await Promise.all([
          supabase
            .from(enrollTable)
            .select(`id, status, session:sessions(${SESSION_SELECT})`)
            .eq("student_id", studentKey),
          recommendedQuery,
          fetchStudentStats(userId, student)
        ]);

        const enrolledSessions = (enrollmentDetails || [])
          .map((row) => mapSessionRow(row.session, { isEnrolled: true, enrollmentStatus: row.status }))
          .filter(Boolean);

        const now = Date.now();
        const liveSessions = enrolledSessions.filter((s) => s.status === "live");
        const upcomingSessions = enrolledSessions
          .filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() >= now)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

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
            streak_days: stats.streak_days ?? student.streak_days ?? 0,
            link_code: student.link_code,
            verification_status: user?.verification_status || "unverified"
          },
          stats: {
            streak_days: stats.streak_days ?? student.streak_days ?? 0,
            enrolled_upcoming: stats.enrolled_upcoming ?? upcomingSessions.length,
            live_now: liveSessions.length,
            completed_sessions: stats.completed_sessions ?? 0,
            questions_total: stats.questions_total ?? 0,
            questions_answered: stats.questions_answered ?? 0,
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
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /student/dashboard", err);
    }
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
      tab: tabRaw = "available",
      search = "",
      only_my_grade = "true",
      subject = "",
      max_price = "",
      school_level = "",
      from: fromRaw = "",
      to: toRaw = ""
    } = req.query;

    const tab = String(tabRaw);
    if (!VALID_SESSION_TABS.has(tab)) {
      return error(res, "تبويب غير صالح", 400);
    }

    const pageNum = Math.max(1, Math.min(100, Number(page) || 1));
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
    const searchTerm = String(search || "").trim();
    if (searchTerm.length > 100) {
      return error(res, "نص البحث طويل جدًا", 400);
    }

    const maxPrice = max_price ? Number(max_price) : null;
    if (max_price && (!Number.isFinite(maxPrice) || maxPrice < 0 || maxPrice > 100000)) {
      return error(res, "الحد الأقصى للسعر غير صالح", 400);
    }

    const subjectKey = String(subject || "").trim().toLowerCase();
    if (subjectKey && !VALID_SUBJECT_KEYS.includes(subjectKey)) {
      return error(res, "المادة غير صالحة", 400);
    }

    const schoolLevel =
      school_level === "preparatory" || school_level === "secondary" ? school_level : null;
    if (school_level && !schoolLevel) {
      return error(res, "المرحلة الدراسية غير صالحة", 400);
    }

    const dateRange = parseScheduledDateRange(fromRaw, toRaw);
    if (dateRange.invalid) {
      return error(res, "نطاق التاريخ غير صالح", 400);
    }

    const sessionsCacheKey = JSON.stringify({
      tab,
      page: pageNum,
      limit: limitNum,
      search: searchTerm,
      only_my_grade,
      subject: subjectKey,
      max_price,
      school_level: schoolLevel,
      from: fromRaw,
      to: toRaw
    });

    const payload = await withCache(
      CACHE.studentSessions(req.user.id, sessionsCacheKey),
      CACHE.TTL.studentSessions,
      async () => {
        const { from, to } = paginate(pageNum, limitNum);

        let query = supabase.from("sessions").select(SESSION_SELECT, { count: "exact" });

        const emptyPayload = (tabCounts) => ({
          sessions: [],
          pagination: paginationMeta(0, pageNum, limitNum),
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
          query = query
            .in("id", enrolledIds)
            .eq("status", "completed")
            .order("scheduled_at", { ascending: false });
        } else {
          query = applyAvailableFilters(query, {
            student,
            enrolledIds,
            onlyMyGrade: only_my_grade,
            subject: subjectKey || null,
            maxPrice: maxPrice && maxPrice > 0 ? maxPrice : null,
            schoolLevel,
            dateFrom: dateRange.from,
            dateTo: dateRange.to
          });
        }

        if (tab !== "available" && schoolLevel) {
          query = query.eq("school_level", schoolLevel);
        }

        if (tab !== "available" && subjectKey) {
          query = query.eq("subject", subjectKey);
        }
        if (tab !== "available" && maxPrice && maxPrice > 0) {
          query = query.lte("price_per_student", maxPrice);
        }

        if (tab !== "available" && (dateRange.from || dateRange.to)) {
          query = applyScheduledDateRange(query, dateRange);
        }

        if (searchTerm) {
          query = query.ilike("title", `%${searchTerm}%`);
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

        return {
          sessions,
          pagination: paginationMeta(totalForPagination, pageNum, limitNum),
          tab_counts: tabCounts,
          grade_label: GRADE_LABELS[student.grade] || student.grade
        };
      }
    );

    return success(res, payload);
  } catch (err) {
    console.error("GET /student/sessions", err?.message || err);
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
    const joinWindow = getSessionJoinWindow(normalized);
    const canJoinLive =
      isEnrolled && (normalized.status === "live" || joinWindow.canJoin);

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
