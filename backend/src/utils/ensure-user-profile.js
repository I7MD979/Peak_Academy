const VALID_ROLES = ["student", "teacher", "parent", "admin"];
const VALID_GRADES = ["first", "second", "third"];

export function buildLinkCode(userId) {
  return String(userId || "")
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
}

export function normalizeRole(role) {
  const value = String(role || "student").toLowerCase();
  return VALID_ROLES.includes(value) ? value : "student";
}

/**
 * Idempotent: ensures public.users + role-specific profile row(s).
 */
export async function ensureUserProfile(
  supabase,
  { id, email, full_name, role, phone = null, grade = null, section = null, subjects = [] }
) {
  if (!id) throw new Error("معرّف المستخدم مطلوب");

  const safeRole = normalizeRole(role);
  const name = String(full_name || email?.split("@")?.[0] || "مستخدم").trim();
  const safeEmail = String(email || "").trim().toLowerCase();

  const { error: userError } = await supabase.from("users").upsert(
    {
      id,
      email: safeEmail || `${id}@peak.local`,
      full_name: name.length >= 2 ? name : "مستخدم بيك",
      role: safeRole,
      phone: phone ? String(phone).trim() : null,
      is_active: true,
      is_verified: true
    },
    { onConflict: "id" }
  );
  if (userError) throw userError;

  if (safeRole === "student") {
    const safeGrade = grade && VALID_GRADES.includes(grade) ? grade : "third";
    const { data: existing } = await supabase
      .from("student_profiles")
      .select("id, link_code, grade, section")
      .eq("user_id", id)
      .maybeSingle();

    const requestedGrade = grade && VALID_GRADES.includes(grade) ? grade : null;

    const { error: studentError } = await supabase.from("student_profiles").upsert(
      {
        user_id: id,
        grade: requestedGrade || existing?.grade || safeGrade,
        section: section !== undefined && section !== null ? String(section).trim() || null : existing?.section ?? null,
        link_code: existing?.link_code || buildLinkCode(id)
      },
      { onConflict: "user_id" }
    );
    if (studentError) throw studentError;
  }

  if (safeRole === "teacher") {
    const subjectList = Array.isArray(subjects)
      ? subjects.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const { error: teacherError } = await supabase.from("teacher_profiles").upsert(
      {
        user_id: id,
        subjects: subjectList,
        commission_rate: 70.0,
        bio: null
      },
      { onConflict: "user_id" }
    );
    if (teacherError) throw teacherError;
  }

  return fetchFullUserProfile(supabase, id);
}

async function fetchUsersRow(supabase, userId) {
  const full = await supabase
    .from("users")
    .select("id, email, phone, full_name, avatar_url, role, is_active, is_verified, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!full.error && full.data) return full.data;

  const minimal = await supabase
    .from("users")
    .select("id, email, phone, full_name, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (minimal.error || !minimal.data) {
    if (full.error && process.env.NODE_ENV !== "production") {
      console.warn("[profile] users select:", full.error.message);
    }
    return null;
  }

  return { ...minimal.data, avatar_url: null, is_verified: false };
}

export async function fetchFullUserProfile(supabase, userId) {
  const user = await fetchUsersRow(supabase, userId);
  if (!user) return null;

  let student_profile = null;
  let teacher_profile = null;

  if (user.role === "student") {
    const { data, error: spError } = await supabase
      .from("student_profiles")
      .select("id, grade, section, streak_days, link_code, parent_id, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (spError) {
      const fallback = await supabase
        .from("student_profiles")
        .select("id, grade, section, link_code")
        .eq("user_id", userId)
        .maybeSingle();
      student_profile = fallback.data;
      if (fallback.error && process.env.NODE_ENV !== "production") {
        console.warn("[profile] student_profiles:", fallback.error.message);
      }
    } else {
      student_profile = data;
    }
  }

  if (user.role === "teacher") {
    const { data, error: tpError } = await supabase
      .from("teacher_profiles")
      .select("id, bio, subjects, rating, commission_rate, id_verified, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (tpError) {
      const fallback = await supabase
        .from("teacher_profiles")
        .select("id, bio, subjects, commission_rate")
        .eq("user_id", userId)
        .maybeSingle();
      teacher_profile = fallback.data;
      if (fallback.error && process.env.NODE_ENV !== "production") {
        console.warn("[profile] teacher_profiles:", fallback.error.message);
      }
    } else {
      teacher_profile = data;
    }
  }

  return {
    ...user,
    student_profile,
    teacher_profile,
    profile_complete: isRoleProfileComplete(user.role, { student_profile, teacher_profile })
  };
}

export function isRoleProfileComplete(role, { student_profile, teacher_profile } = {}) {
  if (role === "student") {
    return Boolean(student_profile?.id && student_profile?.grade);
  }
  if (role === "teacher") return Boolean(teacher_profile?.id);
  return true;
}
