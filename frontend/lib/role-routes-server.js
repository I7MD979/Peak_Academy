export const ROLE_HOME = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard"
};

async function hasRoleProfile(supabase, userId, role) {
  if (role === "student") {
    const { data } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data?.id);
  }
  if (role === "teacher") {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data?.id);
  }
  return true;
}

export async function resolvePostAuthPath(supabase) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return "/auth/login";

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role || !profile?.full_name) {
    return "/onboarding";
  }

  const roleProfileOk = await hasRoleProfile(supabase, user.id, profile.role);
  if (!roleProfileOk) {
    return "/onboarding";
  }

  return ROLE_HOME[profile.role] || "/onboarding";
}
