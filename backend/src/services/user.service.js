import { UserRepository } from "../repositories/user.repository.js";
import { supabase } from "../lib/supabase.js";
import { invalidate, CACHE } from "../lib/cache.js";

const VALID_ROLES = new Set(["student", "teacher", "parent", "admin", "supervisor"]);

function extractStorageObjectPath(publicUrl, bucket) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function cleanupUserAvatar(avatarUrl) {
  const path = extractStorageObjectPath(avatarUrl, "avatars");
  if (!path) return;

  try {
    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) console.warn("[deleteUser] avatar cleanup failed:", error.message);
  } catch (err) {
    console.warn("[deleteUser] avatar cleanup error:", err?.message || err);
  }
}

/** Guards that apply before any admin mutation. */
function assertMutableByAdmin(target, actorId) {
  if (!target) return { ok: false, status: 404, message: "المستخدم غير موجود" };
  if (target.id === actorId) return { ok: false, status: 403, message: "لا يمكنك تعديل حسابك الشخصي من هنا" };
  if (target.role === "admin" || target.role === "supervisor") return { ok: false, status: 403, message: "لا يمكن تعديل حسابات الموظفين" };
  return { ok: true };
}

export const UserService = {
  /** Paginated list with normalised filters. */
  async listUsers({ role, isActive, search, createdFrom, createdTo, page, limit } = {}) {
    const safeRole = VALID_ROLES.has(role) ? role : undefined;
    const safeActive =
      isActive === "true" ? true : isActive === "false" ? false : undefined;

    return UserRepository.findMany({
      role: safeRole,
      isActive: safeActive,
      search,
      createdFrom,
      createdTo,
      page: Number(page) || 1,
      limit: Math.min(Math.max(Number(limit) || 20, 1), 100)
    });
  },

  /** User counts for stats cards. */
  async getUserStats() {
    return UserRepository.countByRole();
  },

  /** Full user detail including role-specific profile. */
  async getUserDetail(userId) {
    return UserRepository.findWithProfile(userId);
  },

  /** Admin: update user name/phone. Role changes require extra care. */
  async updateUser(userId, body, actorId) {
    const target = await UserRepository.findById(userId);
    const guard = assertMutableByAdmin(target, actorId);
    if (!guard.ok) return guard;

    const allowed = {};

    if (body.full_name !== undefined) {
      const name = String(body.full_name || "").trim();
      if (!name || name.length > 100) return { ok: false, status: 400, message: "الاسم غير صالح (1-100 حرف)" };
      allowed.full_name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone || "").trim();
      if (phone && !/^[0-9+\s()-]{6,20}$/.test(phone)) return { ok: false, status: 400, message: "رقم الهاتف غير صالح" };
      allowed.phone = phone || null;
    }

    if (!Object.keys(allowed).length) return { ok: false, status: 400, message: "لا توجد بيانات للتحديث" };

    const updated = await UserRepository.update(userId, allowed);
    await invalidate(CACHE.adminDashboard());
    return { ok: true, data: updated };
  },

  /** Admin: suspend or activate a user account. */
  async setUserStatus(userId, isActive, actorId) {
    const target = await UserRepository.findById(userId);
    const guard = assertMutableByAdmin(target, actorId);
    if (!guard.ok) return guard;

    if (target.is_active === isActive) {
      return {
        ok: false,
        status: 400,
        message: isActive ? "الحساب نشط بالفعل" : "الحساب موقوف بالفعل"
      };
    }

    await UserRepository.setStatus(userId, isActive);
    await invalidate(CACHE.adminDashboard());
    return { ok: true };
  },

  /** Admin: verify a teacher account. */
  async verifyTeacher(userId, actorId) {
    const target = await UserRepository.findById(userId);
    const guard = assertMutableByAdmin(target, actorId);
    if (!guard.ok) return guard;
    if (target.role !== "teacher") return { ok: false, status: 400, message: "يمكن توثيق حسابات المدرسين فقط" };
    if (target.is_verified) return { ok: false, status: 400, message: "المدرس موثّق بالفعل" };

    const profileRes = await supabase.from("teacher_profiles").update({ id_verified: true }).eq("user_id", userId);
    if (profileRes.error) throw profileRes.error;

    await UserRepository.update(userId, { is_verified: true });
    return { ok: true };
  },

  /** Admin: permanently delete user from Supabase Auth (public.users cascades). */
  async deleteUser(userId, actorId) {
    const target = await UserRepository.findById(userId);
    const guard = assertMutableByAdmin(target, actorId);
    if (!guard.ok) return guard;

    await cleanupUserAvatar(target.avatar_url);

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      if (error.status === 404 || /not.*found/i.test(error.message || "")) {
        await UserRepository.hardDelete(userId);
      } else {
        throw error;
      }
    }

    await invalidate(CACHE.adminDashboard());
    return { ok: true };
  },

  /** Admin: get a user's subscription history. */
  async getUserSubscriptions(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) return { ok: false, status: 404, message: "المستخدم غير موجود" };
    if (user.role !== "student") return { ok: false, status: 400, message: "الاشتراكات متاحة للطلاب فقط" };

    const subs = await UserRepository.findUserSubscriptions(userId);
    return { ok: true, data: subs };
  },

  /** Admin: grant bonus sessions to a student's active subscription. */
  async grantSessions(studentId, sessionsToAdd, _actorId) {
    if (!Number.isInteger(sessionsToAdd) || sessionsToAdd < 1 || sessionsToAdd > 200) {
      return { ok: false, status: 400, message: "عدد الحصص يجب أن يكون بين 1 و 200" };
    }

    const student = await UserRepository.findById(studentId);
    if (!student) return { ok: false, status: 404, message: "الطالب غير موجود" };
    if (student.role !== "student") return { ok: false, status: 400, message: "يمكن منح حصص للطلاب فقط" };

    const { data: sub, error: subErr } = await supabase
      .from("student_subscriptions")
      .select("id, sessions_remaining")
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!sub) return { ok: false, status: 404, message: "لا يوجد اشتراك نشط لهذا الطالب" };

    const newCount = Number(sub.sessions_remaining || 0) + sessionsToAdd;
    const { error: updateErr } = await supabase
      .from("student_subscriptions")
      .update({ sessions_remaining: newCount })
      .eq("id", sub.id);
    if (updateErr) throw updateErr;

    return { ok: true, data: { sessions_remaining: newCount, granted: sessionsToAdd } };
  },

  /** Self-service: update own profile fields. */
  async updateOwnProfile(userId, body) {
    const allowed = {};

    if (body.full_name !== undefined) {
      const name = String(body.full_name || "").trim();
      if (!name || name.length > 100) return { ok: false, status: 400, message: "الاسم غير صالح" };
      allowed.full_name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone || "").trim();
      if (phone && !/^[0-9+\s()-]{6,20}$/.test(phone)) return { ok: false, status: 400, message: "رقم الهاتف غير صالح" };
      allowed.phone = phone || null;
    }

    if (!Object.keys(allowed).length) return { ok: false, status: 400, message: "لا توجد بيانات للتحديث" };

    const updated = await UserRepository.update(userId, allowed);
    return { ok: true, data: updated };
  },

  /** Self-service: delete own account. */
  async deleteOwnAccount(userId) {
    await UserRepository.softDelete(userId);
    return { ok: true };
  },

  /** Admin: manually assign a subscription plan to a student. */
  async assignSubscription(studentId, { planId, sessionsOverride, periodDays = 30 }, _actorId) {
    const student = await UserRepository.findById(studentId);
    if (!student) return { ok: false, status: 404, message: "الطالب غير موجود" };
    if (student.role !== "student") return { ok: false, status: 400, message: "يمكن تعيين الاشتراكات للطلاب فقط" };

    const { data: plan, error: planErr } = await supabase
      .from("subscription_plans")
      .select("id, name, sessions_per_month")
      .eq("id", planId)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) return { ok: false, status: 404, message: "الخطة غير موجودة" };

    const safeSessionsOverride = sessionsOverride != null ? Number(sessionsOverride) : null;
    if (safeSessionsOverride !== null && (!Number.isInteger(safeSessionsOverride) || safeSessionsOverride < 0 || safeSessionsOverride > 9999)) {
      return { ok: false, status: 400, message: "عدد الحصص غير صالح" };
    }
    const safePeriodDays = Math.min(Math.max(Number(periodDays) || 30, 1), 3650);

    // Cancel any existing active or trial subscription
    await supabase
      .from("student_subscriptions")
      .update({ status: "cancelled", sessions_remaining: 0 })
      .eq("student_id", studentId)
      .in("status", ["active", "trialing"]);

    const now = new Date();
    const periodEnd = new Date(now.getTime() + safePeriodDays * 24 * 60 * 60 * 1000);

    const { data: sub, error: insertErr } = await supabase
      .from("student_subscriptions")
      .insert({
        student_id: studentId,
        plan_id: planId,
        status: "active",
        sessions_remaining: safeSessionsOverride ?? plan.sessions_per_month,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .select("*, subscription_plans(name, sessions_per_month, price)")
      .single();
    if (insertErr) throw insertErr;

    const { recordSubscriptionAttribution } = await import("./roomAttribution.service.js");
    await recordSubscriptionAttribution(studentId, sub.id).catch(() => {});

    await invalidate(CACHE.studentSubscription(studentId));
    return { ok: true, data: sub };
  },

  /** Admin: modify an existing subscription (sessions, expiry, plan, status). */
  async modifySubscription(studentId, subId, changes, _actorId) {
    const student = await UserRepository.findById(studentId);
    if (!student) return { ok: false, status: 404, message: "الطالب غير موجود" };

    const { data: sub, error: subErr } = await supabase
      .from("student_subscriptions")
      .select("id, student_id, status, sessions_remaining")
      .eq("id", subId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!sub) return { ok: false, status: 404, message: "الاشتراك غير موجود" };

    const updates = {};

    if (changes.sessions_remaining !== undefined) {
      const n = Number(changes.sessions_remaining);
      if (!Number.isInteger(n) || n < 0 || n > 9999) {
        return { ok: false, status: 400, message: "عدد الحصص المتبقية غير صالح" };
      }
      updates.sessions_remaining = n;
    }

    if (changes.current_period_end !== undefined) {
      const d = new Date(changes.current_period_end);
      if (isNaN(d.getTime())) return { ok: false, status: 400, message: "تاريخ الانتهاء غير صالح" };
      updates.current_period_end = d.toISOString();
    }

    if (changes.plan_id !== undefined) {
      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("id", changes.plan_id)
        .maybeSingle();
      if (!plan) return { ok: false, status: 404, message: "الخطة غير موجودة" };
      updates.plan_id = changes.plan_id;
    }

    const ALLOWED_STATUSES = new Set(["active", "frozen", "cancelled", "expired"]);
    if (changes.status !== undefined) {
      if (!ALLOWED_STATUSES.has(changes.status)) return { ok: false, status: 400, message: "حالة غير صالحة" };
      updates.status = changes.status;
    }

    if (!Object.keys(updates).length) return { ok: false, status: 400, message: "لا توجد بيانات للتحديث" };

    const { data: updated, error: updateErr } = await supabase
      .from("student_subscriptions")
      .update(updates)
      .eq("id", subId)
      .select("*, subscription_plans(name, sessions_per_month, price)")
      .single();
    if (updateErr) throw updateErr;

    await invalidate(CACHE.studentSubscription(studentId));
    return { ok: true, data: updated };
  },

  /** Admin: cancel a subscription immediately. */
  async cancelSubscription(studentId, subId, _actorId) {
    const student = await UserRepository.findById(studentId);
    if (!student) return { ok: false, status: 404, message: "الطالب غير موجود" };

    const { data: sub, error: subErr } = await supabase
      .from("student_subscriptions")
      .select("id, status")
      .eq("id", subId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (subErr) throw subErr;
    if (!sub) return { ok: false, status: 404, message: "الاشتراك غير موجود" };
    if (sub.status === "cancelled") return { ok: false, status: 400, message: "الاشتراك ملغي بالفعل" };

    const { error: updateErr } = await supabase
      .from("student_subscriptions")
      .update({ status: "cancelled", sessions_remaining: 0 })
      .eq("id", subId);
    if (updateErr) throw updateErr;

    await invalidate(CACHE.studentSubscription(studentId));
    return { ok: true };
  }
};
