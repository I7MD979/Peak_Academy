import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";
import { success, error, paginated } from "../utils/response.js";
import { CACHE, withCache } from "../lib/cache.js";
import { enqueueJob } from "../lib/queue.js";
import { cleanupOrphanedDailyRooms } from "../services/daily.service.js";

const router = Router();

router.get("/stats", auth, checkRole("admin"), async (_req, res) => {
  try {
    const stats = await withCache(CACHE.adminDashboard(), CACHE.TTL.adminDashboard, async () => {
      const [users, sessions, revenue, withdrawals] = await Promise.all([
        supabase.from("users").select("role", { count: "exact", head: true }),
        supabase.from("sessions").select("status", { count: "exact", head: true }).eq("status", "live"),
        supabase.from("teacher_earnings").select("platform_amount"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
      ]);
      const totalRevenue = revenue.data?.reduce((sum, e) => sum + Number(e.platform_amount || 0), 0) || 0;
      return {
        total_users: users.count || 0,
        live_sessions: sessions.count || 0,
        total_revenue: totalRevenue,
        pending_withdrawals: withdrawals.count || 0
      };
    });
    return success(res, stats);
  } catch (_err) {
    return error(res, "تعذر تحميل الإحصائيات", 500);
  }
});

router.get("/users", auth, checkRole("admin"), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, is_active } = req.query;
    const { from, to } = paginate(page, limit);
    let query = supabase.from("users").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    if (role) query = query.eq("role", role);
    if (is_active === "true") query = query.eq("is_active", true);
    if (is_active === "false") query = query.eq("is_active", false);
    if (search) {
      const term = String(search)
        .trim()
        .replace(/[%_,]/g, "");
      if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, count } = await query;
    return paginated(res, data, paginationMeta(count, Number(page), Number(limit)));
  } catch (_err) {
    return error(res, "Failed to fetch users", 500);
  }
});

router.put("/users/:id/verify", auth, checkRole("admin"), async (req, res) => {
  try {
    const { data: userRow, error: userLookupError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", req.params.id)
      .maybeSingle();

    if (userLookupError) throw userLookupError;
    if (!userRow) return error(res, "User not found", 404);
    if (userRow.role !== "teacher") {
      return error(res, "يمكن توثيق حسابات المدرسين فقط", 400);
    }

    const { error: teacherError } = await supabase
      .from("teacher_profiles")
      .update({ id_verified: true })
      .eq("user_id", req.params.id);
    const { error: userError } = await supabase
      .from("users")
      .update({ is_verified: true })
      .eq("id", req.params.id);

    if (teacherError) throw teacherError;
    if (userError) throw userError;

    return success(res, null, "Teacher verified");
  } catch (_err) {
    return error(res, "Failed to verify teacher", 500);
  }
});

router.put("/users/:id/suspend", auth, checkRole("admin"), async (req, res) => {
  try {
    const { error: dbError } = await supabase.from("users").update({ is_active: false }).eq("id", req.params.id);
    if (dbError) throw dbError;
    return success(res, null, "User suspended");
  } catch (_err) {
    return error(res, "Failed to suspend user", 500);
  }
});

router.put("/users/:id/activate", auth, checkRole("admin"), async (req, res) => {
  try {
    const { error: dbError } = await supabase.from("users").update({ is_active: true }).eq("id", req.params.id);
    if (dbError) throw dbError;
    return success(res, null, "User activated");
  } catch (_err) {
    return error(res, "Failed to activate user", 500);
  }
});

router.get("/withdrawals", auth, checkRole("admin"), async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = req.query.status || "pending";

  try {
    const { from, to } = paginate(page, limit);

    let query = supabase.from("withdrawal_requests").select("*", { count: "exact" }).range(from, to);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const ascending = status === "pending";
    query = query.order("requested_at", { ascending });

    const { data, count, error: dbError } = await query;
    if (dbError) {
      if (dbError.code === "PGRST205" || dbError.code === "42P01") {
        return paginated(res, [], paginationMeta(0, Number(page), Number(limit)));
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
          .select("id, full_name, phone")
          .in("id", userIds);
        usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
      }

      teacherMap = Object.fromEntries(
        (profiles || []).map((p) => [
          p.id,
          {
            full_name: usersById[p.user_id]?.full_name,
            phone: usersById[p.user_id]?.phone
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
    return error(res, "Failed to fetch withdrawals", 500);
  }
});

router.put("/withdrawals/:id", auth, checkRole("admin"), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status) return error(res, "status is required", 400);

    const allowedStatuses = ["approved", "rejected", "paid"];
    if (!allowedStatuses.includes(status)) {
      return error(res, "حالة غير صالحة", 400);
    }

    const { data: withdrawal, error: dbError } = await supabase
      .from("withdrawal_requests")
      .select("teacher_id,status,amount")
      .eq("id", req.params.id)
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
      .eq("id", req.params.id);

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
          data: { withdrawal_id: req.params.id, status }
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
          data: { withdrawal_id: req.params.id, status: "paid" }
        });
      }

      const targetAmount = Number(withdrawal.amount);
      const { data: pendingEarnings } = await supabase
        .from("teacher_earnings")
        .select("id, teacher_amount")
        .eq("teacher_id", withdrawal.teacher_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

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

    return success(res, null, "Withdrawal updated");
  } catch (_err) {
    return error(res, "Failed to update withdrawal", 500);
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

  if (period === "3months") {
    start.setMonth(start.getMonth() - 2);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), bucketCount: 3 };
  }

  if (period === "6months") {
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), bucketCount: 6 };
  }

  if (period === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { startIso: start.toISOString(), bucketCount: 12 };
  }

  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { startIso: start.toISOString(), bucketCount: 1 };
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

function monthKeyFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/reports", auth, checkRole("admin"), async (req, res) => {
  try {
    const period = req.query.period || "month";
    const { startIso, bucketCount } = getPeriodConfig(period);

    const [
      earningsRes,
      withdrawalsRes,
      studentsRes,
      sessionsRes,
      reviewsRes,
      earningsDetailsRes,
      completedSessionsRes
    ] = await Promise.all([
      supabase.from("teacher_earnings").select("platform_amount, created_at").gte("created_at", startIso),
      supabase
        .from("withdrawal_requests")
        .select("amount, processed_at")
        .eq("status", "paid")
        .gte("processed_at", startIso),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "student")
        .gte("created_at", startIso),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("scheduled_at", startIso),
      supabase.from("reviews").select("rating").gte("created_at", startIso),
      supabase
        .from("teacher_earnings")
        .select("teacher_amount, teacher_id, session_id, created_at")
        .gte("created_at", startIso),
      supabase
        .from("sessions")
        .select("id, subject")
        .eq("status", "completed")
        .gte("scheduled_at", startIso)
    ]);

    const monthly = buildMonthlyBuckets(bucketCount);
    const monthlyMap = Object.fromEntries(monthly.map((item) => [item.key, item]));

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
      const { data: profiles } = await supabase
        .from("teacher_profiles")
        .select("id, user_id")
        .in("id", teacherProfileIds);
      const userIds = [...new Set((profiles || []).map((p) => p.user_id).filter(Boolean))];
      const { data: users } = userIds.length
        ? await supabase.from("users").select("id, full_name").in("id", userIds)
        : { data: [] };
      const usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
      teacherNameByProfileId = Object.fromEntries(
        (profiles || []).map((p) => [p.id, usersById[p.user_id]?.full_name || "مدرس"])
      );
    }

    let sessionSubjectById = {};
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, subject")
        .in("id", sessionIds);
      sessionSubjectById = Object.fromEntries(
        (sessions || []).map((s) => [s.id, typeof s.subject === "string" ? s.subject : "مادة"])
      );
    }

    const teacherMap = new Map();
    for (const row of earningsDetailsRes.data || []) {
      const teacherName = teacherNameByProfileId[row.teacher_id] || "مدرس";
      const subjectName = sessionSubjectById[row.session_id] || "مادة";
      const mapKey = teacherName;
      const current = teacherMap.get(mapKey) || {
        teacher_name: teacherName,
        subject: subjectName,
        sessions_count: 0,
        total_earnings: 0
      };
      current.sessions_count += 1;
      current.total_earnings += Number(row.teacher_amount || 0);
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
      const { data: enrollments } = await supabase
        .from("session_enrollments")
        .select("session_id")
        .in("session_id", completedSessionIds);

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
      period,
      summary: {
        platform_revenue: platformRevenue,
        new_students: studentsRes.count || 0,
        completed_sessions: sessionsRes.count || 0,
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

/** One-time / periodic cleanup: delete Daily rooms not tied to live sessions. */
router.get("/cleanup-daily-rooms", auth, checkRole("admin"), async (_req, res) => {
  try {
    if (!process.env.DAILY_API_KEY) {
      return error(res, "DAILY_API_KEY غير مضبوط على الخادم", 503);
    }
    const result = await cleanupOrphanedDailyRooms(supabase);
    return success(
      res,
      {
        deleted: result.deleted?.length || 0,
        failed: result.failed?.length || 0,
        room_names: result.deleted || []
      },
      `تم حذف ${result.deleted?.length || 0} غرفة يتيمة من Daily`
    );
  } catch (err) {
    return error(res, err?.message || "تعذر تنظيف غرف Daily", 500);
  }
});

export default router;
