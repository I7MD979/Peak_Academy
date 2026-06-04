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

function isMissingColumnError(err) {
  const msg = String(err?.message || "");
  return err?.code === "42703" || /column|does not exist/i.test(msg);
}

async function upsertUsersRow(supabase, payload) {
  const run = (row) => supabase.from("users").upsert(row, { onConflict: "id" });

  let { error } = await run(payload);
  if (!error) return;

  if (isMissingColumnError(error)) {
    const { is_verified, avatar_url, ...rest } = payload;
    ({ error } = await run(rest));
    if (!error) return;
  }

  if (error.code === "23505") {
    const { data: existing } = await supabase
      .from("users")
      .select("email")
      .eq("id", payload.id)
      .maybeSingle();
    if (existing?.email) {
      ({ error } = await run({ ...payload, email: existing.email }));
      if (!error) return;
    }
  }

  throw error;
}

async function upsertStudentProfileRow(supabase, row) {
  const run = (payload) =>
    supabase.from("student_profiles").upsert(payload, { onConflict: "user_id" });

  let { error } = await run(row);
  if (!error) return;

  if (isMissingColumnError(error)) {
    const minimal = {
      user_id: row.user_id,
      grade: row.grade,
      link_code: row.link_code
    };
    ({ error } = await run(minimal));
    if (!error) return;
  }

  if (error.code === "23505" && row.link_code) {
    const suffix = String(Date.now()).slice(-4);
    ({ error } = await run({ ...row, link_code: `${row.link_code}${suffix}` }));
    if (!error) return;
  }

  throw error;
}

async function upsertTeacherProfileRow(supabase, row) {
  const run = (payload) =>
    supabase.from("teacher_profiles").upsert(payload, { onConflict: "user_id" });

  let { error } = await run(row);
  if (!error) return;

  if (isMissingColumnError(error)) {
    const { commission_rate, bio, rating, id_verified, ...rest } = row;
    ({ error } = await run({ user_id: row.user_id, subjects: row.subjects || [] }));
    if (!error) return;
  }

  throw error;
}

async function resolveProfileAfterEnsure(supabase, id, safeRole, hints = {}) {
  const full = await fetchFullUserProfile(supabase, id);
  if (full) return full;

  const user = await fetchUsersRow(supabase, id);
  if (!user) {
    return {
      id,
      email: hints.email || "",
      phone: hints.phone || null,
      full_name: hints.full_name || "مستخدم",
      avatar_url: null,
      role: safeRole,
      is_active: true,
      is_verified: true,
      student_profile: null,
      teacher_profile: null,
      profile_complete: safeRole === "admin" || safeRole === "parent"
    };
  }

  let student_profile = null;
  let teacher_profile = null;

  if (safeRole === "student") {
    const { data } = await supabase
      .from("student_profiles")
      .select("id, grade, section, link_code")
      .eq("user_id", id)
      .maybeSingle();
    student_profile = data;
  }

  if (safeRole === "teacher") {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("id, subjects")
      .eq("user_id", id)
      .maybeSingle();
    teacher_profile = data;
  }

  return {
    ...user,
    student_profile,
    teacher_profile,
    profile_complete: isRoleProfileComplete(safeRole, { student_profile, teacher_profile })
  };
}

/**
 * Idempotent: ensures public.users + role-specific profile row(s).
 */
export async function ensureUserProfile(
  supabase,
  { id, email, full_name, role, phone = null, grade = null, section = null, subjects = [] }
) {
  if (!id) throw new Error("معرّف المستخدم مطلوب");

  const { data: existingUser } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", id)
    .maybeSingle();

  const safeRole = normalizeRole(role || existingUser?.role);
  const roleToWrite = existingUser?.role ? normalizeRole(existingUser.role) : safeRole;
  const name = String(full_name || email?.split("@")?.[0] || "مستخدم").trim();
  const incomingEmail = String(email || "").trim().toLowerCase();
  const safeEmail =
    incomingEmail || String(existingUser?.email || "").trim().toLowerCase() || `${id}@peak.local`;

  await upsertUsersRow(supabase, {
    id,
    email: safeEmail,
    full_name: name.length >= 2 ? name : "مستخدم بيك",
    role: roleToWrite,
    phone: phone ? String(phone).trim() : null,
    is_active: true,
    is_verified: true
  });

  const effectiveRole = roleToWrite;

  if (effectiveRole === "student") {
    const safeGrade = grade && VALID_GRADES.includes(grade) ? grade : "third";
    const { data: existing } = await supabase
      .from("student_profiles")
      .select("id, link_code, grade, section")
      .eq("user_id", id)
      .maybeSingle();

    const requestedGrade = grade && VALID_GRADES.includes(grade) ? grade : null;

    await upsertStudentProfileRow(supabase, {
      user_id: id,
      grade: requestedGrade || existing?.grade || safeGrade,
      section:
        section !== undefined && section !== null
          ? String(section).trim() || null
          : (existing?.section ?? null),
      link_code: existing?.link_code || buildLinkCode(id)
    });
  }

  if (effectiveRole === "teacher") {
    const subjectList = Array.isArray(subjects)
      ? subjects.map((s) => String(s).trim()).filter(Boolean)
      : [];

    await upsertTeacherProfileRow(supabase, {
      user_id: id,
      subjects: subjectList,
      commission_rate: 70.0,
      bio: null
    });
  }

  return resolveProfileAfterEnsure(supabase, id, effectiveRole, {
    email: safeEmail,
    phone,
    full_name: name.length >= 2 ? name : "مستخدم بيك"
  });
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
