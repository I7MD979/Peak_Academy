import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  resolvePostAuthPath,
  ROLE_HOME
} from "./lib/role-routes-edge.js";
import { applySecurityHeaders, SENSITIVE_QUERY_KEYS } from "./lib/security-headers.js";

const PUBLIC_PATHS = [
  "/",
  "/privacy",
  "/terms",
  "/auth/login",
  "/auth/register",
  "/auth/callback",
  "/auth/google-callback",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/setup-profile"
];

const ROLE_ROUTES = {
  "/student": "student",
  "/teacher": "teacher",
  "/parent": "parent",
  "/admin": ["admin", "supervisor"]
};

const AUTH_ENTRY_PATHS = new Set(["/auth/login", "/auth/register"]);

function isOnboardingPath(path) {
  return path === "/onboarding" || path.startsWith("/onboarding/");
}

function isPublicPath(path) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function getRoleForPath(path) {
  for (const [prefix, role] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(prefix)) return role;
  }
  return null;
}

function roleAllowedForPath(userRole, requiredRole) {
  if (!requiredRole) return true;
  if (Array.isArray(requiredRole)) return requiredRole.includes(userRole);
  return userRole === requiredRole;
}

function redirectWithCookies(url, res, pathname = "/") {
  const redirect = NextResponse.redirect(url);
  res.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return applySecurityHeaders(redirect, pathname);
}

function stripSensitiveQueryParams(request) {
  const url = request.nextUrl.clone();
  let stripped = false;
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
      stripped = true;
    }
  }
  if (!stripped) return null;
  return NextResponse.redirect(url, 302);
}

function secureResponse(response, pathname) {
  return applySecurityHeaders(response, pathname);
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const sensitiveRedirect = stripSensitiveQueryParams(request);
  if (sensitiveRedirect) {
    return secureResponse(sensitiveRedirect, pathname);
  }

  let res = secureResponse(
    NextResponse.next({
      request: { headers: request.headers }
    }),
    pathname
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isPublicPath(pathname)) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return secureResponse(NextResponse.redirect(loginUrl), pathname);
    }
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    const redirectTarget =
      isOnboardingPath(pathname) && request.nextUrl.searchParams.get("next")
        ? `/onboarding?next=${encodeURIComponent(request.nextUrl.searchParams.get("next"))}`
        : pathname;
    loginUrl.searchParams.set("redirect", redirectTarget);
    return redirectWithCookies(loginUrl, res, pathname);
  }

  if (isPublicPath(pathname)) {
    if (session?.access_token && AUTH_ENTRY_PATHS.has(pathname)) {
      const nextPath = await resolvePostAuthPath(session.access_token, request);
      if (nextPath && nextPath !== "/auth/login") {
        return redirectWithCookies(new URL(nextPath, request.url), res, pathname);
      }
    }
    return res;
  }

  if (isOnboardingPath(pathname)) {
    if (session?.access_token) {
      const user = await fetchAuthProfile(session.access_token, request);
      if (user && isProfileComplete(user) && ROLE_HOME[user.role]) {
        return redirectWithCookies(new URL(ROLE_HOME[user.role], request.url), res, pathname);
      }
    }
    return res;
  }

  const requiredRole = getRoleForPath(pathname);

  if (session?.access_token && requiredRole) {
    const user = await fetchAuthProfile(session.access_token, request);

    if (!user?.role || !isProfileComplete(user)) {
      return redirectWithCookies(new URL("/onboarding", request.url), res, pathname);
    }

    if (!roleAllowedForPath(user.role, requiredRole)) {
      const dest = ROLE_HOME[user.role] || "/auth/login";
      return redirectWithCookies(new URL(dest, request.url), res, pathname);
    }

    // Study rooms gate: require active trial or paid subscription
    if (pathname.startsWith("/student/study-rooms")) {
      try {
        const { data: hasAccess } = await supabase.rpc("has_room_access", {
          p_user_id: user.id
        });
        if (hasAccess === false) {
          const subscribeUrl = new URL("/student/subscription", request.url);
          subscribeUrl.searchParams.set("reason", "study_rooms");
          subscribeUrl.searchParams.set("redirect", pathname);
          return redirectWithCookies(subscribeUrl, res, pathname);
        }
      } catch {
        // On RPC failure, allow through — backend enforces the gate
      }
    }
  }

  if (pathname === "/dashboard" && session?.access_token) {
    const nextPath =
      (await resolvePostAuthPath(session.access_token, request)) ?? "/onboarding";
    return redirectWithCookies(new URL(nextPath, request.url), res, pathname);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
