import { supabase } from "../lib/supabase.js";
import { paginate, paginationMeta } from "../utils/paginate.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const USER_BASE_COLS =
  "id, full_name, email, phone, avatar_url, role, is_active, is_verified, created_at";

const TEACHER_BASE_COLS = "bio, subjects, rating, commission_rate, id_verified, created_at";
const TEACHER_EXTENDED_COLS =
  "id, bio, subjects, rating, experience_years, education, social_url, commission_rate, id_verified, created_at";

const SUBSCRIPTION_BASE_SELECT = `
  id, status, sessions_remaining, current_period_start, current_period_end, created_at,
  subscription_plans ( name, sessions_per_month, price )
`;

const SUBSCRIPTION_EXTENDED_SELECT = `
  id, status, sessions_remaining, current_period_start, current_period_end,
  frozen_at, frozen_until, created_at,
  subscription_plans ( name, sessions_per_month, price )
`;

function sanitizeSearch(value) {
  return String(value || "")
    .trim()
    .replace(/[%_,]/g, "")
    .slice(0, 100);
}

function parseDateEnd(value) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function parseDateStart(value) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isMissingColumnError(error) {
  const code = error?.code;
  const msg = String(error?.message || "").toLowerCase();
  return code === "42703" || code === "PGRST204" || msg.includes("column");
}

function stripOptionalUserColumns(payload) {
  const next = { ...payload };
  delete next.updated_at;
  delete next.deleted_at;
  return next;
}

async function selectUserQuery(id) {
  let result = await supabase.from("users").select(USER_BASE_COLS).eq("id", id).maybeSingle();
  if (!result.error) return result;

  if (isMissingColumnError(result.error)) {
    result = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  }
  return result;
}

async function patchUser(id, payload) {
  let result = await supabase.from("users").update(payload).eq("id", id).select(USER_BASE_COLS).single();
  if (!result.error) return result.data;

  if (isMissingColumnError(result.error)) {
    result = await supabase
      .from("users")
      .update(stripOptionalUserColumns(payload))
      .eq("id", id)
      .select(USER_BASE_COLS)
      .single();
    if (!result.error) return result.data;
  }

  throw result.error;
}

async function patchUserNoReturn(id, payload) {
  let result = await supabase.from("users").update(payload).eq("id", id);
  if (!result.error) return;

  if (isMissingColumnError(result.error)) {
    result = await supabase.from("users").update(stripOptionalUserColumns(payload)).eq("id", id);
    if (!result.error) return;
  }

  throw result.error;
}

async function selectTeacherProfile(userId) {
  let result = await supabase
    .from("teacher_profiles")
    .select(TEACHER_EXTENDED_COLS)
    .eq("user_id", userId)
    .maybeSingle();
  if (!result.error) return result.data;

  if (isMissingColumnError(result.error)) {
    result = await supabase
      .from("teacher_profiles")
      .select(TEACHER_BASE_COLS)
      .eq("user_id", userId)
      .maybeSingle();
    if (!result.error) return result.data;
  }

  throw result.error;
}

async function selectUserSubscriptions(userId) {
  let result = await supabase
    .from("student_subscriptions")
    .select(SUBSCRIPTION_EXTENDED_SELECT)
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (!result.error) return result.data || [];

  if (isMissingColumnError(result.error)) {
    result = await supabase
      .from("student_subscriptions")
      .select(SUBSCRIPTION_BASE_SELECT)
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (!result.error) return result.data || [];
  }

  throw result.error;
}

export const UserRepository = {
  /**
   * Paginated user list with optional filters.
   * @returns {{ data: object[], pagination: object }}
   */
  async findMany({ role, isActive, search, createdFrom, createdTo, page = 1, limit = 20 } = {}) {
    const { from, to, page: pageNum, limit: limitNum } = paginate(page, limit);
    const VALID_ROLES = new Set(["student", "teacher", "parent", "admin", "supervisor"]);

    let query = supabase
      .from("users")
      .select(USER_BASE_COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (role && VALID_ROLES.has(role)) query = query.eq("role", role);
    if (isActive === true) query = query.eq("is_active", true);
    if (isActive === false) query = query.eq("is_active", false);

    const fromIso = parseDateStart(createdFrom);
    const toIso = parseDateEnd(createdTo);
    if (fromIso) query = query.gte("created_at", fromIso);
    if (toIso) query = query.lte("created_at", toIso);

    const term = sanitizeSearch(search);
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

    let { data, count, error } = await query;
    if (error && isMissingColumnError(error)) {
      query = supabase
        .from("users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (role && VALID_ROLES.has(role)) query = query.eq("role", role);
      if (isActive === true) query = query.eq("is_active", true);
      if (isActive === false) query = query.eq("is_active", false);
      if (fromIso) query = query.gte("created_at", fromIso);
      if (toIso) query = query.lte("created_at", toIso);
      if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      ({ data, count, error } = await query);
    }
    if (error) throw error;

    return { data: data || [], pagination: paginationMeta(count, pageNum, limitNum) };
  },

  /** Fetch one user row. */
  async findById(id) {
    if (!UUID_RE.test(id)) return null;
    const { data, error } = await selectUserQuery(id);
    if (error) throw error;
    return data;
  },

  /**
   * Fetch user row + role-specific profile in one call.
   * Returns { user, profile } where profile is student_profiles, teacher_profiles, or null.
   */
  async findWithProfile(id) {
    if (!UUID_RE.test(id)) return null;

    const { data: user, error: userErr } = await selectUserQuery(id);
    if (userErr) throw userErr;
    if (!user) return null;

    let profile = null;

    if (user.role === "student") {
      const { data } = await supabase
        .from("student_profiles")
        .select("grade, section, link_code, streak_days, created_at")
        .eq("user_id", id)
        .maybeSingle();
      profile = data || null;
    } else if (user.role === "teacher") {
      profile = await selectTeacherProfile(id);
    } else if (user.role === "parent") {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("user_id, grade, link_code")
        .eq("parent_id", id);
      if (error && isMissingColumnError(error)) {
        const links = await supabase
          .from("parent_children")
          .select("student_id")
          .eq("parent_id", id);
        if (links.error) throw links.error;
        profile = { children: links.data || [] };
      } else {
        if (error) throw error;
        profile = { children: data || [] };
      }
    }

    return { user, profile };
  },

  /** Update allowed user fields. */
  async update(id, data) {
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    const ALLOWED = new Set(["full_name", "phone", "avatar_url", "is_active", "is_verified", "updated_at"]);
    const payload = {};
    for (const [k, v] of Object.entries(data)) {
      if (ALLOWED.has(k)) payload[k] = v;
    }
    if (!Object.keys(payload).length) throw new Error("no_fields");
    payload.updated_at = new Date().toISOString();

    return patchUser(id, payload);
  },

  /** Toggle is_active status. */
  async setStatus(id, isActive) {
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    await patchUserNoReturn(id, { is_active: isActive, updated_at: new Date().toISOString() });
  },

  /** Soft-delete: mark deleted_at when available. Fallback: deactivate only. */
  async softDelete(id) {
    if (!UUID_RE.test(id)) throw new Error("invalid_id");
    await patchUserNoReturn(id, {
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  },

  /** Count users grouped by role and active status for stats cards. */
  async countByRole() {
    const [total, students, teachers, parents, admins, suspended] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "parent"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "admin"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", false)
    ]);
    return {
      total: total.count || 0,
      students: students.count || 0,
      teachers: teachers.count || 0,
      parents: parents.count || 0,
      admins: admins.count || 0,
      suspended: suspended.count || 0
    };
  },

  /** Get student's subscription history (active + expired). */
  async findUserSubscriptions(userId) {
    if (!UUID_RE.test(userId)) return [];
    return selectUserSubscriptions(userId);
  }
};
