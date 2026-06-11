/**
 * Edge-safe role routing helpers (middleware only).
 * Do not import server-only modules here — Vercel Edge bundles this file.
 */

import { normalizeApiBaseUrl } from "@/lib/api-base";

export const ROLE_HOME = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard",
  supervisor: "/admin/dashboard"
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
  if (user.role === "admin" || user.role === "supervisor" || user.role === "parent") {
    return true;
  }
  return true;
}

function isLocalhostConfiguredUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Same-origin /peak-api proxy (matches browser + next.config rewrites). */
function getApiUrl(request) {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured && !isLocalhostConfiguredUrl(configured)) {
    return normalizeApiBaseUrl(configured);
  }

  const upstream = process.env.API_UPSTREAM_URL?.trim();
  if (upstream) {
    const base = upstream.replace(/\/$/, "");
    return base.endsWith("/api") ? base : `${base}/api`;
  }
  if (request?.url) {
    return `${new URL(request.url).origin}/peak-api`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/peak-api`;
  }
  return "http://localhost:4000/api";
}

export async function fetchAuthProfile(accessToken, request) {
  if (!accessToken) return null;
  const apiUrl = getApiUrl(request);
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

/**
 * Post-auth destination. Returns null when the API rejects the token (stale session).
 */
export async function resolvePostAuthPath(accessToken, request) {
  if (!accessToken) return "/auth/login";

  const apiUrl = getApiUrl(request);

  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });

    if (res.status === 401) return null;

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
