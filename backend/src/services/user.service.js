import { UserRepository } from "../repositories/user.repository.js";
import { supabase } from "../lib/supabase.js";
import { invalidate, CACHE } from "../lib/cache.js";

const VALID_ROLES = new Set(["student", "teacher", "parent", "admin"]);

/** Guards that apply before any admin mutation. */
function assertMutableByAdmin(target, actorId) {
  if (!target) return { ok: false, status: 404, message: "المستخدم غير موجود" };
  if (target.id === actorId) return { ok: false, status: 403, message: "لا يمكنك تعديل حسابك الشخصي من هنا" };
  if (target.role === "admin") return { ok: false, status: 403, message: "لا يمكن تعديل حسابات المشرفين" };
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

  /** Admin: soft-delete user (deactivate + set deleted_at). */
  async deleteUser(userId, actorId) {
    const target = await UserRepository.findById(userId);
    const guard = assertMutableByAdmin(target, actorId);
    if (!guard.ok) return guard;

    await UserRepository.softDelete(userId);
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
  }
};
