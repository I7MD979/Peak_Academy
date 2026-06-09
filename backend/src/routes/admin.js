import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import {
  requirePermission,
  checkAdminOrSupervisor,
  invalidatePermissionCache
} from "../middleware/requirePermission.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { CACHE, invalidate, withCache } from "../lib/cache.js";
import { enqueueJob } from "../lib/queue.js";
import { cleanupOrphanedLiveKitRooms, isLiveKitConfigured } from "../services/livekit.service.js";
import { querySessionsList } from "../utils/session-select.js";
import { isValidGrade, VALID_SCHOOL_LEVELS } from "../lib/grades.js";
import { UserService } from "../services/user.service.js";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDateEndIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function parseDateStartIso(value) {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

const VALID_REPORT_PERIODS = new Set(["month", "3months", "6months", "year"]);
const MAX_CUSTOM_REPORT_MONTHS = 24;

function assertSupabaseResults(results) {
  for (const result of results) {
    if (result?.error) throw result.error;
  }
}


async function fetchAdminDashboardStats() {
  const [users, liveSessions, scheduledSessions, revenue, withdrawals] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("teacher_earnings").select("platform_amount"),
    supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
  ]);

  assertSupabaseResults([users, liveSessions, scheduledSessions, withdrawals]);

  if (revenue.error) throw revenue.error;

  const totalRevenue = revenue.data?.reduce((sum, e) => sum + Number(e.platform_amount || 0), 0) || 0;

  return {
    total_users: users.count || 0,
    live_sessions: liveSessions.count || 0,
    scheduled_sessions: scheduledSessions.count || 0,
    total_revenue: totalRevenue,
    pending_withdrawals: withdrawals.count || 0
  };
}

router.get("/stats", auth, requirePermission("dashboard"), async (_req, res) => {
  try {
    const stats = await withCache(CACHE.adminDashboard(), CACHE.TTL.adminDashboard, fetchAdminDashboardStats);
    return success(res, stats);
  } catch (_err) {
    return error(res, "تعذر تحميل الإحصائيات", 500);
  }
});

router.get("/dashboard", auth, requirePermission("dashboard"), async (_req, res) => {
  try {
    const payload = await withCache(CACHE.adminDashboardFull(), CACHE.TTL.adminDashboard, async () => {
      const [stats, recentUsersResult, sessionsResult] = await Promise.all([
        fetchAdminDashboardStats(),
        supabase
          .from("users")
          .select("id, full_name, role, email, phone, avatar_url, is_active, is_verified, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        querySessionsList((query, orderColumn) => {
          let q = query.eq("status", "scheduled").limit(5);
          q = q.order(orderColumn, { ascending: true });
          return q;
        })
      ]);

      assertSupabaseResults([recentUsersResult]);

      return {
        stats,
        recent_users: recentUsersResult.data || [],
        recent_sessions: sessionsResult.data || []
      };
    });

    return success(res, payload);
  } catch (_err) {
    return error(res, "تعذر تحميل لوحة التحكم", 500);
  }
});

router.get("/users/stats", auth, requirePermission("users.read"), async (_req, res) => {
  try {
    const [total, students, teachers, parents, admins, suspended] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "parent"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", false)
    ]);

    return success(res, {
      total: total.count || 0,
      students: students.count || 0,
      teachers: teachers.count || 0,
      parents: parents.count || 0,
      admins: admins.count || 0,
      suspended: suspended.count || 0
    });
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات المستخدمين", 500);
  }
});

router.get("/sessions/stats", auth, requirePermission("sessions.read"), async (_req, res) => {
  try {
    const [total, scheduled, live, completed, cancelled] = await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "live"),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "cancelled")
    ]);

    assertSupabaseResults([total, scheduled, live, completed, cancelled]);

    return success(res, {
      total: total.count || 0,
      scheduled: scheduled.count || 0,
      live: live.count || 0,
      completed: completed.count || 0,
      cancelled: cancelled.count || 0
    });
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات الجلسات", 500);
  }
});

router.get("/sessions", auth, requirePermission("sessions.read"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all",
      search,
      school_level,
      grade,
      scheduled_from,
      scheduled_to
    } = req.query;

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const { from, to } = paginate(pageNum, safeLimit);

    const validStatuses = new Set(["all", "scheduled", "live", "completed", "cancelled"]);
    const safeStatus = validStatuses.has(String(status)) ? String(status) : "all";
    const ascending = safeStatus === "completed" || safeStatus === "cancelled" ? false : true;

    const searchTerm = sanitizeSearchTerm(search);
    let teacherIdsForSearch = [];

    if (searchTerm) {
      const { data: teachers, error: teacherError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "teacher")
        .ilike("full_name", `%${searchTerm}%`);
      if (teacherError) throw teacherError;
      teacherIdsForSearch = (teachers || []).map((t) => t.id);
    }

    const schoolLevelRaw = String(school_level || "").trim();
    const safeSchoolLevel = VALID_SCHOOL_LEVELS.includes(schoolLevelRaw) ? schoolLevelRaw : null;

    const gradeRaw = String(grade || "").trim();
    const safeGrade = isValidGrade(gradeRaw) ? gradeRaw : null;

    const { data, count, db_warning } = await querySessionsList((query, orderColumn) => {
      let q = query.range(from, to);

      if (safeStatus !== "all") {
        q = q.eq("status", safeStatus);
      }

      q = q.order(orderColumn, { ascending });

      if (safeGrade) q = q.eq("grade", safeGrade);
      if (safeSchoolLevel) q = q.eq("school_level", safeSchoolLevel);

      const scheduleColumn = orderColumn === "start_time" ? "start_time" : "scheduled_at";
      const fromIso = parseDateStartIso(scheduled_from);
      if (fromIso) q = q.gte(scheduleColumn, fromIso);

      const toIso = parseDateEndIso(scheduled_to);
      if (toIso) q = q.lte(scheduleColumn, toIso);

      if (searchTerm) {
        if (teacherIdsForSearch.length) {
          q = q.or(`title.ilike.%${searchTerm}%,teacher_id.in.(${teacherIdsForSearch.join(",")})`);
        } else {
          q = q.ilike("title", `%${searchTerm}%`);
        }
      }

      return q;
    });

    if (db_warning) {
      res.setHeader("X-Peak-Db-Warning", "schema");
    }

    return paginated(res, data || [], paginationMeta(count ?? 0, pageNum, safeLimit));
  } catch (_err) {
    return error(res, "تعذر تحميل الجلسات", 500);
  }
});

router.get("/users", auth, requirePermission("users.read"), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, is_active, created_from, created_to } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const { from, to } = paginate(page, safeLimit);
    let query = supabase
      .from("users")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (role && ["student", "teacher", "parent", "admin", "supervisor"].includes(role)) {
      query = query.eq("role", role);
    }
    if (is_active === "true") query = query.eq("is_active", true);
    if (is_active === "false") query = query.eq("is_active", false);
    if (created_from) {
      const fromDate = new Date(String(created_from));
      if (!Number.isNaN(fromDate.getTime())) {
        query = query.gte("created_at", fromDate.toISOString());
      }
    }
    const createdToIso = parseDateEndIso(created_to);
    if (createdToIso) query = query.lte("created_at", createdToIso);
    if (search) {
      const term = String(search)
        .trim()
        .replace(/[%_,]/g, "");
      if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;
    return paginated(res, data, paginationMeta(count, Number(page), safeLimit));
  } catch (_err) {
    return error(res, "تعذر تحميل المستخدمين", 500);
  }
});

// ── User detail ──────────────────────────────────────────────────────────────
router.get("/users/:id", auth, requirePermission("users.read"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.getUserDetail(req.params.id);
    if (!result) return error(res, "المستخدم غير موجود", 404);
    return success(res, result);
  } catch (_err) {
    return error(res, "تعذر تحميل تفاصيل المستخدم", 500);
  }
});

// ── Edit user (name / phone) ─────────────────────────────────────────────────
router.patch("/users/:id", auth, requirePermission("users.edit"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.updateUser(req.params.id, req.body || {}, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data, "تم تحديث بيانات المستخدم");
  } catch (_err) {
    return error(res, "تعذر تحديث المستخدم", 500);
  }
});

// ── Verify teacher ───────────────────────────────────────────────────────────
router.put("/users/:id/verify", auth, requirePermission("users.edit"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.verifyTeacher(req.params.id, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, null, "تم توثيق المدرس بنجاح");
  } catch (_err) {
    return error(res, "تعذر توثيق المدرس", 500);
  }
});

// ── Suspend / Activate ───────────────────────────────────────────────────────
router.put("/users/:id/suspend", auth, requirePermission("users.edit"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.setUserStatus(req.params.id, false, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, null, "تم تعليق الحساب بنجاح");
  } catch (_err) {
    return error(res, "تعذر تعليق الحساب", 500);
  }
});

router.put("/users/:id/activate", auth, requirePermission("users.edit"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.setUserStatus(req.params.id, true, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, null, "تم تفعيل الحساب بنجاح");
  } catch (_err) {
    return error(res, "تعذر تفعيل الحساب", 500);
  }
});

// ── Soft delete ───────────────────────────────────────────────────────────────
router.delete("/users/:id", auth, requirePermission("users.delete"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.deleteUser(req.params.id, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, null, "تم حذف الحساب");
  } catch (_err) {
    return error(res, "تعذر حذف الحساب", 500);
  }
});

// ── Subscription history ──────────────────────────────────────────────────────
router.get("/users/:id/subscriptions", auth, requirePermission("users.read"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const result = await UserService.getUserSubscriptions(req.params.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data);
  } catch (_err) {
    return error(res, "تعذر تحميل الاشتراكات", 500);
  }
});

// ── Grant bonus sessions ──────────────────────────────────────────────────────
router.post("/users/:id/grant-sessions", auth, requirePermission("users.subscriptions"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const sessions = parseInt(req.body?.sessions, 10);
    const result = await UserService.grantSessions(req.params.id, sessions, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data, `تم منح ${result.data.granted} حصة بنجاح`);
  } catch (_err) {
    return error(res, "تعذر منح الحصص", 500);
  }
});

// ── Assign subscription manually ─────────────────────────────────────────────
router.post("/users/:id/subscriptions", auth, requirePermission("users.subscriptions"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const { plan_id, sessions_override, period_days } = req.body || {};
    if (!plan_id || !UUID_RE.test(String(plan_id))) return error(res, "معرّف الخطة مطلوب وصالح", 400);
    const result = await UserService.assignSubscription(
      req.params.id,
      { planId: plan_id, sessionsOverride: sessions_override, periodDays: period_days },
      req.user.id
    );
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data, "تم تعيين الاشتراك بنجاح");
  } catch (_err) {
    return error(res, "تعذر تعيين الاشتراك", 500);
  }
});

// ── Modify subscription ───────────────────────────────────────────────────────
router.patch("/users/:id/subscriptions/:subId", auth, requirePermission("users.subscriptions"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    if (!UUID_RE.test(req.params.subId)) return error(res, "معرّف الاشتراك غير صالح", 400);
    const { sessions_remaining, current_period_end, plan_id, status } = req.body || {};
    const result = await UserService.modifySubscription(
      req.params.id,
      req.params.subId,
      { sessions_remaining, current_period_end, plan_id, status },
      req.user.id
    );
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, result.data, "تم تحديث الاشتراك");
  } catch (_err) {
    return error(res, "تعذر تحديث الاشتراك", 500);
  }
});

// ── Cancel subscription ───────────────────────────────────────────────────────
router.delete("/users/:id/subscriptions/:subId", auth, requirePermission("users.subscriptions"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    if (!UUID_RE.test(req.params.subId)) return error(res, "معرّف الاشتراك غير صالح", 400);
    const result = await UserService.cancelSubscription(req.params.id, req.params.subId, req.user.id);
    if (!result.ok) return error(res, result.message, result.status);
    return success(res, null, "تم إلغاء الاشتراك");
  } catch (_err) {
    return error(res, "تعذر إلغاء الاشتراك", 500);
  }
});

router.get("/withdrawals/stats", auth, requirePermission("withdrawals.read"), async (_req, res) => {
  try {
    const [total, pending, approved, paid, rejected, pendingRows] = await Promise.all([
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "paid"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("withdrawal_requests").select("amount").eq("status", "pending")
    ]);

    const pendingAmount =
      (pendingRows.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

    return success(res, {
      total: total.count || 0,
      pending: pending.count || 0,
      approved: approved.count || 0,
      paid: paid.count || 0,
      rejected: rejected.count || 0,
      pending_amount: pendingAmount
    });
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات السحب", 500);
  }
});

router.get("/withdrawals", auth, requirePermission("withdrawals.read"), async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const status = req.query.status || "pending";
  const method = req.query.method;
  const search = req.query.search;
  const requestedFrom = req.query.requested_from;
  const requestedTo = req.query.requested_to;

  const validStatuses = ["all", "pending", "approved", "paid", "rejected"];
  const safeStatus = validStatuses.includes(String(status)) ? String(status) : "pending";

  try {
    const { from, to } = paginate(page, limit);

    let teacherIdsForSearch = [];
    if (search) {
      const term = String(search)
        .trim()
        .replace(/[%_,]/g, "");
      if (term) {
        const { data: users } = await supabase
          .from("users")
          .select("id")
          .eq("role", "teacher")
          .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
        const userIds = (users || []).map((u) => u.id);
        if (userIds.length) {
          const { data: profiles } = await supabase
            .from("teacher_profiles")
            .select("id")
            .in("user_id", userIds);
          teacherIdsForSearch = (profiles || []).map((p) => p.id);
        }
      }
    }

    let query = supabase.from("withdrawal_requests").select("*", { count: "exact" }).range(from, to);

    if (safeStatus && safeStatus !== "all") {
      query = query.eq("status", safeStatus);
    }

    if (method) {
      query = query.eq("method", String(method));
    }

    if (requestedFrom) {
      const fromDate = new Date(String(requestedFrom));
      if (!Number.isNaN(fromDate.getTime())) {
        query = query.gte("requested_at", fromDate.toISOString());
      }
    }

    if (requestedTo) {
      const toDate = parseDateEndIso(requestedTo);
      if (toDate) query = query.lte("requested_at", toDate);
    }

    if (search) {
      const term = String(search)
        .trim()
        .replace(/[%_,]/g, "");
      if (term) {
        if (teacherIdsForSearch.length) {
          query = query.in("teacher_id", teacherIdsForSearch);
        } else {
          query = query.ilike("account_number", `%${term}%`);
        }
      }
    }

    const ascending = safeStatus === "pending";
    query = query.order("requested_at", { ascending });

    const { data, count, error: dbError } = await query;
    if (dbError) {
      if (dbError.code === "PGRST205" || dbError.code === "42P01") {
        return paginated(res, [], paginationMeta(0, Number(page), limit));
      }
      throw dbError;
    }

    const teacherProfileIds = [...new Set((data || []).map((r) => r.teacher_id).filter(Boolean))];
    let teacherMap = {};

    if (teacherProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("teacher_profiles")
        .select("id, user_id")
        .in("id", teacherProfileIds);

      const userIds = [...new Set((profiles || []).map((p) => p.user_id).filter(Boolean))];
      let usersById = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, phone, email")
          .in("id", userIds);
        usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
      }

      teacherMap = Object.fromEntries(
        (profiles || []).map((p) => [
          p.id,
          {
            user: usersById[p.user_id]
              ? {
                  full_name: usersById[p.user_id].full_name,
                  phone: usersById[p.user_id].phone,
                  email: usersById[p.user_id].email
                }
              : null
          }
        ])
      );
    }

    const rows = (data || []).map((row) => ({
      ...row,
      teacher: teacherMap[row.teacher_id] || null
    }));

    return paginated(res, rows, paginationMeta(count, page, limit));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("admin withdrawals", err);
    }
    return error(res, "تعذر تحميل طلبات السحب", 500);
  }
});

router.put("/withdrawals/:id", auth, requirePermission("withdrawals.write"), async (req, res) => {
  try {
    const withdrawalId = String(req.params.id || "").trim();
    if (!withdrawalId) return error(res, "معرّف الطلب غير صالح", 400);

    const { status, reason } = req.body;
    if (!status) return error(res, "حالة الطلب مطلوبة", 400);

    const allowedStatuses = ["approved", "rejected", "paid"];
    if (!allowedStatuses.includes(status)) {
      return error(res, "حالة غير صالحة", 400);
    }

    if (reason && String(reason).trim().length > 500) {
      return error(res, "سبب الرفض طويل جداً (500 حرف كحد أقصى)", 400);
    }

    const { data: withdrawal, error: dbError } = await supabase
      .from("withdrawal_requests")
      .select("teacher_id,status,amount")
      .eq("id", withdrawalId)
      .single();

    if (dbError) throw dbError;
    if (!withdrawal) return error(res, "طلب السحب غير موجود", 404);

    if (withdrawal.status === "pending" && !["approved", "rejected"].includes(status)) {
      return error(res, "يمكن قبول أو رفض الطلبات المعلقة فقط", 400);
    }

    if (withdrawal.status === "approved" && status !== "paid") {
      return error(res, "يمكن تسجيل الدفع للطلبات المقبولة فقط", 400);
    }

    if (withdrawal.status === "rejected" || withdrawal.status === "paid") {
      return error(res, "لا يمكن تعديل هذا الطلب بعد الآن", 400);
    }

    const updatePayload = {
      status,
      processed_at: new Date().toISOString()
    };

    if (status === "rejected" && reason) {
      updatePayload.notes = String(reason).trim();
    }

    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update(updatePayload)
      .eq("id", withdrawalId);

    if (updateError) throw updateError;

    if (status === "approved" || status === "rejected") {
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("user_id")
        .eq("id", withdrawal.teacher_id)
        .maybeSingle();

      if (teacherProfile?.user_id) {
        const { data: teacherUser } = await supabase
          .from("users")
          .select("email, full_name")
          .eq("id", teacherProfile.user_id)
          .maybeSingle();

        if (teacherUser?.email) {
          await enqueueJob("email", "withdrawal-processed", {
            to: teacherUser.email,
            teacherName: teacherUser.full_name,
            amount: withdrawal.amount,
            status
          });
        }

        await enqueueJob("notifications", "push-notification", {
          userId: teacherProfile.user_id,
          type: "withdrawal",
          title: status === "approved" ? "تمت الموافقة على طلب السحب" : "تم رفض طلب السحب",
          body:
            status === "approved"
              ? `تمت الموافقة على سحب ${withdrawal.amount} جنيه`
              : `تم رفض طلب السحب${reason ? `: ${reason}` : ""}`,
          data: { withdrawal_id: withdrawalId, status }
        });
      }
    }

    if (status === "paid") {
      const { data: teacherProfilePaid } = await supabase
        .from("teacher_profiles")
        .select("user_id")
        .eq("id", withdrawal.teacher_id)
        .maybeSingle();
      if (teacherProfilePaid?.user_id) {
        await enqueueJob("notifications", "push-notification", {
          userId: teacherProfilePaid.user_id,
          type: "withdrawal",
          title: "تم تحويل مبلغ السحب",
          body: `تم دفع ${withdrawal.amount} جنيه إلى حسابك`,
          data: { withdrawal_id: withdrawalId, status: "paid" }
        });
      }

      const targetAmount = Number(withdrawal.amount);
      const { data: pendingEarnings } = await supabase
        .from("teacher_earnings")
        .select("id, teacher_amount")
        .eq("teacher_id", withdrawal.teacher_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1000);

      let covered = 0;
      const idsToMark = [];
      for (const row of pendingEarnings || []) {
        if (covered >= targetAmount) break;
        const rowAmount = Number(row.teacher_amount || 0);
        if (rowAmount <= 0) continue;
        if (covered + rowAmount <= targetAmount) {
          idsToMark.push(row.id);
          covered += rowAmount;
        }
      }

      if (idsToMark.length > 0) {
        await supabase
          .from("teacher_earnings")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .in("id", idsToMark);
      }
    }

    return success(res, null, "تم تحديث طلب السحب بنجاح");
  } catch (_err) {
    return error(res, "تعذر تحديث طلب السحب", 500);
  }
});

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

function getPeriodConfig(period) {
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

function resolveReportRange(period, dateFrom, dateTo) {
  const hasFrom = Boolean(dateFrom);
  const hasTo = Boolean(dateTo);

  if (hasFrom || hasTo) {
    const startIso = hasFrom ? parseDateStartIso(dateFrom) : null;
    const endIso = hasTo ? parseDateEndIso(dateTo) : parseDateEndIso(new Date().toISOString().slice(0, 10));

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
        d.setMonth(0, 1);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })();
    const buckets = buildMonthlyBucketsFromRange(effectiveStart, endIso);
    if (buckets.length > MAX_CUSTOM_REPORT_MONTHS) {
      return {
        ok: false,
        status: 400,
        message: `الفترة المخصصة طويلة جداً (الحد الأقصى ${MAX_CUSTOM_REPORT_MONTHS} شهراً)`
      };
    }

    return {
      ok: true,
      period: "custom",
      startIso: effectiveStart,
      endIso,
      buckets,
      periodLabel: "فترة مخصصة"
    };
  }

  const normalizedPeriod = VALID_REPORT_PERIODS.has(period) ? period : "month";
  const { startIso, endIso, bucketCount } = getPeriodConfig(normalizedPeriod);
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
    buckets: buildMonthlyBuckets(bucketCount),
    periodLabel: periodLabels[normalizedPeriod] || periodLabels.month
  };
}

function buildMonthlyBuckets(bucketCount) {
  const buckets = [];
  const now = new Date();

  for (let i = bucketCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      month: AR_MONTHS[date.getMonth()],
      revenue: 0,
      withdrawn: 0
    });
  }

  return buckets;
}

function buildMonthlyBucketsFromRange(startIso, endIso) {
  const buckets = [];
  const cursor = new Date(startIso);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endIso);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      month: AR_MONTHS[cursor.getMonth()],
      revenue: 0,
      withdrawn: 0
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function monthKeyFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/reports", auth, requirePermission("reports"), async (req, res) => {
  try {
    const period = String(req.query.period || "month");
    const dateFrom = req.query.from ? String(req.query.from).trim() : "";
    const dateTo = req.query.to ? String(req.query.to).trim() : "";

    const range = resolveReportRange(period, dateFrom, dateTo);
    if (!range.ok) {
      return error(res, range.message, range.status);
    }

    const { startIso, endIso, buckets: monthly, period: resolvedPeriod, periodLabel } = range;
    const monthlyMap = Object.fromEntries(monthly.map((item) => [item.key, item]));

    const earningsQuery = supabase
      .from("teacher_earnings")
      .select("platform_amount, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    const withdrawalsQuery = supabase
      .from("withdrawal_requests")
      .select("amount, processed_at")
      .eq("status", "paid")
      .gte("processed_at", startIso)
      .lte("processed_at", endIso);
    const studentsQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    const sessionsQuery = supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso);
    const reviewsQuery = supabase
      .from("reviews")
      .select("rating")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    const earningsDetailsQuery = supabase
      .from("teacher_earnings")
      .select("teacher_amount, teacher_id, session_id, created_at")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .limit(5000);
    const completedSessionsQuery = supabase
      .from("sessions")
      .select("id, subject")
      .eq("status", "completed")
      .gte("scheduled_at", startIso)
      .lte("scheduled_at", endIso)
      .limit(5000);

    const [
      earningsRes,
      withdrawalsRes,
      studentsRes,
      sessionsRes,
      reviewsRes,
      earningsDetailsRes,
      completedSessionsRes
    ] = await Promise.all([
      earningsQuery,
      withdrawalsQuery,
      studentsQuery,
      sessionsQuery,
      reviewsQuery,
      earningsDetailsQuery,
      completedSessionsQuery
    ]);

    assertSupabaseResults([
      earningsRes,
      withdrawalsRes,
      studentsRes,
      sessionsRes,
      reviewsRes,
      earningsDetailsRes,
      completedSessionsRes
    ]);

    for (const row of earningsRes.data || []) {
      const key = monthKeyFromDate(row.created_at);
      if (!key || !monthlyMap[key]) continue;
      monthlyMap[key].revenue += Number(row.platform_amount || 0);
    }

    for (const row of withdrawalsRes.data || []) {
      const key = monthKeyFromDate(row.processed_at);
      if (!key || !monthlyMap[key]) continue;
      monthlyMap[key].withdrawn += Number(row.amount || 0);
    }

    const platformRevenue = (earningsRes.data || []).reduce(
      (sum, row) => sum + Number(row.platform_amount || 0),
      0
    );
    const totalWithdrawn = (withdrawalsRes.data || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const ratings = reviewsRes.data || [];
    const avgRating =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce((sum, row) => sum + Number(row.rating || 0), 0) / ratings.length
            ).toFixed(1)
          )
        : 0;

    const teacherProfileIds = [
      ...new Set((earningsDetailsRes.data || []).map((r) => r.teacher_id).filter(Boolean))
    ];
    const sessionIds = [
      ...new Set((earningsDetailsRes.data || []).map((r) => r.session_id).filter(Boolean))
    ];

    let teacherNameByProfileId = {};
    if (teacherProfileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("teacher_profiles")
        .select("id, user_id")
        .in("id", teacherProfileIds);
      if (profilesError) throw profilesError;

      const userIds = [...new Set((profiles || []).map((p) => p.user_id).filter(Boolean))];
      const { data: users, error: usersError } = userIds.length
        ? await supabase.from("users").select("id, full_name").in("id", userIds)
        : { data: [], error: null };
      if (usersError) throw usersError;

      const usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
      teacherNameByProfileId = Object.fromEntries(
        (profiles || []).map((p) => [p.id, usersById[p.user_id]?.full_name || "مدرس"])
      );
    }

    let sessionSubjectById = {};
    if (sessionIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, subject")
        .in("id", sessionIds);
      if (sessionsError) throw sessionsError;
      sessionSubjectById = Object.fromEntries(
        (sessions || []).map((s) => [s.id, typeof s.subject === "string" ? s.subject : "مادة"])
      );
    }

    const teacherMap = new Map();
    for (const row of earningsDetailsRes.data || []) {
      if (!row.teacher_id) continue;
      const teacherName = teacherNameByProfileId[row.teacher_id] || "مدرس";
      const subjectName = sessionSubjectById[row.session_id] || "مادة";
      const mapKey = row.teacher_id;
      const current = teacherMap.get(mapKey) || {
        teacher_id: row.teacher_id,
        teacher_name: teacherName,
        subject: subjectName,
        sessions_count: 0,
        total_earnings: 0
      };
      current.sessions_count += 1;
      current.total_earnings += Number(row.teacher_amount || 0);
      if (!current.subject || current.subject === "مادة") {
        current.subject = subjectName;
      }
      teacherMap.set(mapKey, current);
    }

    const topTeachers = [...teacherMap.values()]
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));

    const subjectMap = new Map();
    const completedSessionIds = (completedSessionsRes.data || []).map((row) => row.id);
    let enrollmentCountBySession = {};

    if (completedSessionIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("session_enrollments")
        .select("session_id")
        .in("session_id", completedSessionIds);
      if (enrollmentsError) throw enrollmentsError;

      for (const row of enrollments || []) {
        enrollmentCountBySession[row.session_id] =
          (enrollmentCountBySession[row.session_id] || 0) + 1;
      }
    }

    for (const row of completedSessionsRes.data || []) {
      const subjectName = typeof row.subject === "string" ? row.subject : "مادة";
      const enrolled = enrollmentCountBySession[row.id] || 0;
      const current = subjectMap.get(subjectName) || {
        subject: subjectName,
        sessions_count: 0,
        students_count: 0
      };
      current.sessions_count += 1;
      current.students_count += Number(enrolled);
      subjectMap.set(subjectName, current);
    }

    const topSubjects = [...subjectMap.values()]
      .sort((a, b) => b.students_count - a.students_count)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));

    return success(res, {
      period: resolvedPeriod,
      period_label: periodLabel,
      range: {
        from: startIso,
        to: endIso
      },
      summary: {
        platform_revenue: platformRevenue,
        total_withdrawn: totalWithdrawn,
        new_students: studentsRes.count || 0,
        completed_sessions: sessionsRes.count || 0,
        reviews_count: ratings.length,
        avg_rating: avgRating
      },
      monthly_revenue: monthly,
      top_teachers: topTeachers,
      top_subjects: topSubjects
    });
  } catch (_err) {
    return error(res, "تعذر تحميل التقارير", 500);
  }
});

function sanitizeSearchTerm(value) {
  return String(value || "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 100);
}

function validatePlanBody(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) errors.push("اسم الخطة مطلوب");
    else if (name.length > 80) errors.push("اسم الخطة طويل جداً (80 حرفاً كحد أقصى)");
    else data.name = name;
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) errors.push("السعر غير صالح");
    else if (price > 999999) errors.push("السعر كبير جداً");
    else data.price = Math.round(price * 100) / 100;
  }

  if (!partial || body.sessions_per_month !== undefined) {
    const sessions = Number(body.sessions_per_month);
    if (!Number.isInteger(sessions) || sessions < 1) {
      errors.push("عدد الحصص يجب أن يكون عدداً صحيحاً أكبر من صفر");
    } else if (sessions > 500) {
      errors.push("عدد الحصص كبير جداً");
    } else {
      data.sessions_per_month = sessions;
    }
  }

  if (body.features !== undefined) {
    const raw = Array.isArray(body.features) ? body.features : [];
    const features = raw
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);
    if (features.some((item) => item.length > 200)) {
      errors.push("إحدى المميزات طويلة جداً");
    } else {
      data.features = features;
    }
  }

  if (body.description !== undefined) {
    const description = body.description ? String(body.description).trim().slice(0, 500) : null;
    data.description = description || null;
  }

  if (body.featured_label !== undefined) {
    data.featured_label = body.featured_label
      ? String(body.featured_label).trim().slice(0, 40)
      : null;
  }

  if (body.sort_order !== undefined) {
    const sortOrder = Number(body.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
      errors.push("ترتيب العرض غير صالح");
    } else {
      data.sort_order = sortOrder;
    }
  }

  if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);
  if (body.is_featured !== undefined) data.is_featured = Boolean(body.is_featured);

  return { ok: errors.length === 0, errors, data };
}

async function attachActiveSubscriberCounts(plans) {
  const planIds = (plans || []).map((plan) => plan.id).filter(Boolean);
  if (!planIds.length) {
    return (plans || []).map((plan) => ({ ...plan, active_subscribers: 0 }));
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from("student_subscriptions")
    .select("plan_id")
    .eq("status", "active")
    .in("plan_id", planIds);

  if (subsError) throw subsError;

  const countsByPlan = {};
  for (const row of subscriptions || []) {
    countsByPlan[row.plan_id] = (countsByPlan[row.plan_id] || 0) + 1;
  }

  return (plans || []).map((plan) => ({
    ...plan,
    active_subscribers: countsByPlan[plan.id] || 0
  }));
}
router.get("/plans/stats", auth, requirePermission("plans.read"), async (_req, res) => {
  try {
    const [total, active, inactive, featured, activeSubs] = await Promise.all([
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }),
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_featured", true),
      supabase
        .from("student_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    ]);

    assertSupabaseResults([total, active, inactive, featured, activeSubs]);

    return success(res, {
      total: total.count || 0,
      active: active.count || 0,
      inactive: inactive.count || 0,
      featured: featured.count || 0,
      active_subscriptions: activeSubs.count || 0
    });
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات الخطط", 500);
  }
});

router.get("/plans", auth, requirePermission("plans.read"), async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const search = sanitizeSearchTerm(req.query.search);
    const validStatuses = new Set(["all", "active", "inactive", "featured"]);
    const safeStatus = validStatuses.has(status) ? status : "all";

    let query = supabase.from("subscription_plans").select("*").order("sort_order", { ascending: true });

    if (safeStatus === "active") query = query.eq("is_active", true);
    if (safeStatus === "inactive") query = query.eq("is_active", false);
    if (safeStatus === "featured") query = query.eq("is_featured", true);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error: dbError } = await query;
    if (dbError) throw dbError;

    const plans = await attachActiveSubscriberCounts(data || []);
    return success(res, plans);
  } catch (_err) {
    return error(res, "تعذر تحميل الخطط", 500);
  }
});

router.post("/plans", auth, requirePermission("plans.create"), async (req, res) => {
  try {
    const validated = validatePlanBody(req.body || {});
    if (!validated.ok) {
      return error(res, validated.errors[0], 400);
    }

    const payload = {
      ...validated.data,
      features: validated.data.features ?? [],
      is_active: validated.data.is_active ?? true,
      is_featured: validated.data.is_featured ?? false,
      sort_order: validated.data.sort_order ?? 0
    };

    const { data, error: dbError } = await supabase
      .from("subscription_plans")
      .insert(payload)
      .select("*")
      .single();

    if (dbError) throw dbError;
    await Promise.all([invalidate("public:landing"), invalidate(CACHE.subscriptionPlans())]);
    return success(res, data, "تم إنشاء الخطة");
  } catch (_err) {
    return error(res, "تعذر إنشاء الخطة", 500);
  }
});

router.put("/plans/:id", auth, requirePermission("plans.edit"), async (req, res) => {
  try {
    const planId = req.params.id;
    if (!UUID_RE.test(planId)) {
      return error(res, "معرّف الخطة غير صالح", 400);
    }

    const validated = validatePlanBody(req.body || {}, { partial: true });
    if (!validated.ok) {
      return error(res, validated.errors[0], 400);
    }

    if (!Object.keys(validated.data).length) {
      return error(res, "لا توجد بيانات للتحديث", 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("id", planId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return error(res, "الخطة غير موجودة", 404);
    }

    const updates = {
      ...validated.data,
      updated_at: new Date().toISOString()
    };

    const { data, error: dbError } = await supabase
      .from("subscription_plans")
      .update(updates)
      .eq("id", planId)
      .select("*")
      .single();

    if (dbError) throw dbError;
    await Promise.all([invalidate("public:landing"), invalidate(CACHE.subscriptionPlans())]);
    return success(res, data, "تم تحديث الخطة");
  } catch (_err) {
    return error(res, "تعذر تحديث الخطة", 500);
  }
});

router.delete("/plans/:id", auth, requirePermission("plans.delete"), async (req, res) => {
  try {
    const planId = req.params.id;
    if (!UUID_RE.test(planId)) {
      return error(res, "معرّف الخطة غير صالح", 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from("subscription_plans")
      .select("id, name")
      .eq("id", planId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return error(res, "الخطة غير موجودة", 404);
    }

    const { count, error: countError } = await supabase
      .from("student_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId)
      .eq("status", "active");

    if (countError) throw countError;
    if ((count || 0) > 0) {
      return error(res, `لا يمكن إيقاف الخطة — ${count} اشتراك نشط`, 409);
    }

    const { error: dbError } = await supabase
      .from("subscription_plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", planId);

    if (dbError) throw dbError;
    await Promise.all([invalidate("public:landing"), invalidate(CACHE.subscriptionPlans())]);
    return success(res, null, "تم إيقاف الخطة");
  } catch (_err) {
    return error(res, "تعذر إيقاف الخطة", 500);
  }
});

router.get("/landing-stats/overview", auth, requirePermission("landing"), async (_req, res) => {
  try {
    const nowIso = new Date().toISOString();

    const [total, visible, hidden, plans, promos] = await Promise.all([
      supabase.from("platform_stats").select("id", { count: "exact", head: true }),
      supabase.from("platform_stats").select("id", { count: "exact", head: true }).eq("is_visible", true),
      supabase.from("platform_stats").select("id", { count: "exact", head: true }).eq("is_visible", false),
      supabase.from("subscription_plans").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase
        .from("promotions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    ]);

    assertSupabaseResults([total, visible, hidden, plans, promos]);

    return success(res, {
      total_stats: total.count || 0,
      visible_stats: visible.count || 0,
      hidden_stats: hidden.count || 0,
      active_plans: plans.count || 0,
      active_promos: promos.count || 0
    });
  } catch (_err) {
    return error(res, "تعذر تحميل ملخص صفحة الهبوط", 500);
  }
});

router.get("/landing-stats", auth, requirePermission("landing"), async (req, res) => {
  try {
    const visibility = String(req.query.visibility || "all");
    const search = sanitizeSearchTerm(req.query.search);
    const validVisibility = new Set(["all", "visible", "hidden"]);
    const safeVisibility = validVisibility.has(visibility) ? visibility : "all";

    let query = supabase.from("platform_stats").select("*").order("sort_order", { ascending: true });

    if (safeVisibility === "visible") query = query.eq("is_visible", true);
    if (safeVisibility === "hidden") query = query.eq("is_visible", false);

    if (search) {
      query = query.or(`label.ilike.%${search}%,key.ilike.%${search}%,hint.ilike.%${search}%`);
    }

    const { data, error: dbError } = await query;
    if (dbError) throw dbError;
    return success(res, data || []);
  } catch (_err) {
    return error(res, "تعذر تحميل إحصائيات الهبوط", 500);
  }
});

function validateLandingStatUpdate(body) {
  const errors = [];
  const updates = {};

  if (body.value !== undefined) {
    const value = String(body.value).trim().slice(0, 40);
    if (!value) errors.push("القيمة الظاهرة مطلوبة");
    else updates.value = value;
  }

  if (body.label !== undefined) {
    const label = String(body.label).trim().slice(0, 80);
    if (!label) errors.push("العنوان مطلوب");
    else updates.label = label;
  }

  if (body.hint !== undefined) {
    updates.hint = body.hint ? String(body.hint).trim().slice(0, 120) : null;
  }

  if (body.is_visible !== undefined) {
    updates.is_visible = Boolean(body.is_visible);
  }

  if (body.sort_order !== undefined) {
    const sortOrder = Number(body.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
      errors.push("ترتيب العرض غير صالح");
    } else {
      updates.sort_order = sortOrder;
    }
  }

  return { ok: errors.length === 0, errors, updates };
}

router.put("/landing-stats/:id", auth, requirePermission("landing"), async (req, res) => {
  try {
    const statId = req.params.id;
    if (!UUID_RE.test(statId)) {
      return error(res, "معرّف الإحصائية غير صالح", 400);
    }

    const validated = validateLandingStatUpdate(req.body || {});
    if (!validated.ok) {
      return error(res, validated.errors[0], 400);
    }

    if (!Object.keys(validated.updates).length) {
      return error(res, "لا توجد بيانات للتحديث", 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from("platform_stats")
      .select("id")
      .eq("id", statId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return error(res, "الإحصائية غير موجودة", 404);
    }

    const updates = {
      ...validated.updates,
      updated_at: new Date().toISOString()
    };

    const { data, error: dbError } = await supabase
      .from("platform_stats")
      .update(updates)
      .eq("id", statId)
      .select("*")
      .single();

    if (dbError) throw dbError;

    await invalidate("public:landing");
    return success(res, data, "تم تحديث الإحصائية");
  } catch (_err) {
    return error(res, "تعذر تحديث الإحصائية", 500);
  }
});

// ── Current user's permissions (admin or supervisor) ─────────────────────────
router.get("/me/permissions", auth, checkAdminOrSupervisor, async (req, res) => {
  try {
    const { user } = req;
    if (user.role === "admin") {
      return success(res, { role: "admin", permissions: ["admin.all"], is_admin: true });
    }
    const { data } = await supabase
      .from("admin_permissions")
      .select("permissions")
      .eq("user_id", user.id)
      .maybeSingle();
    return success(res, {
      role: "supervisor",
      permissions: data?.permissions || [],
      is_admin: false
    });
  } catch (_err) {
    return error(res, "تعذر تحميل الصلاحيات", 500);
  }
});

// ── Staff list (admin only) ───────────────────────────────────────────────────
router.get("/staff", auth, checkRole("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role: roleFilter } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const { from, to } = paginate(Number(page) || 1, safeLimit);

    const roles =
      roleFilter === "supervisor" ? ["supervisor"] :
      roleFilter === "admin" ? ["admin"] :
      ["admin", "supervisor"];

    let query = supabase
      .from("users")
      .select("id, full_name, email, role, avatar_url, is_active, created_at", { count: "exact" })
      .in("role", roles)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search) {
      const term = sanitizeSearchTerm(search);
      if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, count, error: dbError } = await query;
    if (dbError) throw dbError;

    const supervisorIds = (data || []).filter((u) => u.role === "supervisor").map((u) => u.id);
    let permsByUserId = {};
    if (supervisorIds.length) {
      const { data: permsData } = await supabase
        .from("admin_permissions")
        .select("user_id, permissions")
        .in("user_id", supervisorIds);
      permsByUserId = Object.fromEntries((permsData || []).map((p) => [p.user_id, p]));
    }

    const staff = (data || []).map((u) => ({
      ...u,
      permissions: u.role === "admin" ? ["admin.all"] : (permsByUserId[u.id]?.permissions || [])
    }));

    return paginated(res, staff, paginationMeta(count, Number(page), safeLimit));
  } catch (_err) {
    return error(res, "تعذر تحميل قائمة الموظفين", 500);
  }
});

// ── Change staff role (admin only) ────────────────────────────────────────────
router.put("/staff/:id/role", auth, checkRole("admin"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    if (req.params.id === req.user.id) return error(res, "لا يمكنك تعديل دورك الخاص", 403);

    const { role } = req.body || {};
    if (!["supervisor", "student"].includes(role)) return error(res, "الدور غير صالح", 400);

    const { data: target, error: fetchErr } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!target) return error(res, "المستخدم غير موجود", 404);
    if (target.role === "admin") return error(res, "لا يمكن تعديل حساب مدير آخر", 403);

    const { error: updateErr } = await supabase
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (updateErr) throw updateErr;

    if (role !== "supervisor") {
      await supabase.from("admin_permissions").delete().eq("user_id", req.params.id);
    }

    invalidatePermissionCache(req.params.id);
    return success(res, null, "تم تحديث الدور بنجاح");
  } catch (_err) {
    return error(res, "تعذر تحديث الدور", 500);
  }
});

// ── Get staff member's permissions (admin only) ───────────────────────────────
router.get("/staff/:id/permissions", auth, checkRole("admin"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);
    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!user) return error(res, "المستخدم غير موجود", 404);
    if (user.role === "admin") return success(res, { permissions: ["admin.all"] });

    const { data } = await supabase
      .from("admin_permissions")
      .select("permissions")
      .eq("user_id", req.params.id)
      .maybeSingle();
    return success(res, { permissions: data?.permissions || [] });
  } catch (_err) {
    return error(res, "تعذر تحميل الصلاحيات", 500);
  }
});

// ── Set staff member's permissions (admin only) ───────────────────────────────
const VALID_ASSIGNABLE = new Set([
  "dashboard",
  "users.read", "users.edit", "users.delete", "users.subscriptions",
  "sessions.read",
  "withdrawals.read", "withdrawals.write",
  "reports",
  "plans.read", "plans.create", "plans.edit", "plans.delete",
  "promotions.read", "promotions.create", "promotions.edit", "promotions.delete",
  "landing"
]);

router.put("/staff/:id/permissions", auth, checkRole("admin"), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return error(res, "معرّف المستخدم غير صالح", 400);

    const { data: user } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!user) return error(res, "المستخدم غير موجود", 404);
    if (user.role !== "supervisor") return error(res, "يمكن تعيين الصلاحيات للمشرفين فقط", 400);

    const perms = req.body?.permissions;
    if (!Array.isArray(perms)) return error(res, "قائمة الصلاحيات غير صالحة", 400);

    const clean = [...new Set(perms.filter((p) => VALID_ASSIGNABLE.has(String(p))))];

    const { error: upsertErr } = await supabase
      .from("admin_permissions")
      .upsert(
        { user_id: req.params.id, permissions: clean, granted_by: req.user.id, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (upsertErr) throw upsertErr;

    invalidatePermissionCache(req.params.id);
    return success(res, { permissions: clean }, "تم تحديث الصلاحيات");
  } catch (_err) {
    return error(res, "تعذر تحديث الصلاحيات", 500);
  }
});

/** One-time / periodic cleanup: delete LiveKit rooms not tied to live sessions. */
router.get("/cleanup-daily-rooms", auth, checkRole("admin"), async (_req, res) => {
  try {
    if (!isLiveKitConfigured()) {
      return error(res, "LIVEKIT غير مضبوط على الخادم", 503);
    }
    const result = await cleanupOrphanedLiveKitRooms(supabase);
    return success(
      res,
      {
        deleted: result.deleted?.length || 0,
        failed: result.failed?.length || 0,
        room_names: result.deleted || []
      },
      `تم حذف ${result.deleted?.length || 0} غرفة يتيمة من LiveKit`
    );
  } catch (err) {
    return error(res, err?.message || "تعذر تنظيف غرف LiveKit", 500);
  }
});

export default router;
