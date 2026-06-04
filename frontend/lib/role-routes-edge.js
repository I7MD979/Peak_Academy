/**
 * Edge-safe role routing helpers (middleware only).
 * Do not import server-only modules here — Vercel Edge bundles this file.
 */

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
    return user.profile_complete === true;
  }
  return true;
}

function getApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (process.env.VERCEL) return null;

  return "http://localhost:4000/api";
}

export async function fetchAuthProfile(accessToken) {
  if (!accessToken) return null;
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
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

export async function resolvePostAuthPath(accessToken) {
  if (!accessToken) return "/auth/login";

  const apiUrl = getApiUrl();
  if (!apiUrl) return "/onboarding";

  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
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
