import { ROLE_HOME, isProfileComplete } from "./role-routes.js";
import { getApiBaseUrl } from "@/lib/api-base";

export { ROLE_HOME, isProfileComplete };

const API_URL = getApiBaseUrl();

export async function fetchAuthProfile(accessToken) {
  if (!accessToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.success ? payload.data : null;
  } catch {
    return null;
  }
}

async function resolveViaApi(accessToken) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (res.status === 401) return "/auth/login";

  const payload = await res.json();
  const user = payload?.data;

  if (!payload?.success || !user?.role || !user?.full_name) {
    return "/onboarding";
  }

  const needsRoleProfile = user.role === "student" || user.role === "teacher";
  const profileComplete = !needsRoleProfile || user.profile_complete === true;

  if (!profileComplete) {
    return "/onboarding";
  }

  return ROLE_HOME[user.role] || "/onboarding";
}

async function resolveViaSupabase(supabase) {
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

  if (profile.role === "student") {
    const { data } = await supabase
      .from("student_profiles")
      .select("id, grade")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data?.id || !data?.grade) return "/onboarding";
  }

  if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teacher_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data?.id) return "/onboarding";
  }

  return ROLE_HOME[profile.role] || "/onboarding";
}

export async function resolvePostAuthPath(supabase, accessToken = null) {
  let token = accessToken;

  if (!token) {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    token = session?.access_token || null;
  }

  if (token) {
    try {
      return await resolveViaApi(token);
    } catch {
      // fall back to direct Supabase reads
    }
  }

  return resolveViaSupabase(supabase);
}
