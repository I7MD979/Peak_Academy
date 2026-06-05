import { getApiBaseUrl } from "@/lib/api-base";

export const ROLE_HOME = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard"
};

export function isProfileComplete(user) {
  if (!user?.role || !user?.full_name) return false;
  if (user.role === "student") {
    return (
      user.profile_complete === true &&
      Boolean(user.student_profile?.grade || user.grade)
    );
  }
  if (user.role === "teacher") {
    return user.profile_complete === true || Boolean(user.teacher_profile?.id);
  }
  return true;
}

/** Client-side post-login redirect (uses API, same rules as middleware). */
export async function resolvePostAuthPathClient(accessToken) {
  const API_URL = getApiBaseUrl();
  if (!accessToken) return "/auth/login";

  try {
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
    if (!isProfileComplete(user)) {
      return "/onboarding";
    }
    return ROLE_HOME[user.role] || "/onboarding";
  } catch {
    return "/onboarding";
  }
}
