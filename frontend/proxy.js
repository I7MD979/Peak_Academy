import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  resolvePostAuthPath,
  ROLE_HOME
} from "./lib/role-routes-edge.js";
import {
  applySecurityHeaders,
  createRequestSecurityContext,
  issueCsrfCookie,
  SENSITIVE_QUERY_KEYS
} from "./lib/security-headers.js";

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

function isMalformedAssetPath(pathname) {
  const lower = pathname.toLowerCase();
  return (
    lower.includes("%2f") ||
    (lower.includes("&w=") && !lower.startsWith("/_next/image")) ||
    (lower.includes("&q=") && !lower.startsWith("/_next/image"))
  );
}

function finalizeResponse(response, request, pathname, ctx) {
  issueCsrfCookie(response, request, pathname, ctx.csrfToken);
  return applySecurityHeaders(response, pathname, ctx.nonce);
}

function redirectWithCookies(url, res, pathname, request, ctx) {
  const redirect = NextResponse.redirect(url);
  res.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return finalizeResponse(redirect, request, pathname, ctx);
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const ctx = createRequestSecurityContext(request);

  if (isMalformedAssetPath(pathname)) {
    return finalizeResponse(new NextResponse(null, { status: 404 }), request, pathname, ctx);
  }

  const sensitiveRedirect = stripSensitiveQueryParams(request);
  if (sensitiveRedirect) {
    return finalizeResponse(sensitiveRedirect, request, pathname, ctx);
  }

  let res = finalizeResponse(
    NextResponse.next({
      request: { headers: ctx.requestHeaders }
    }),
    request,
    pathname,
    ctx
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isPublicPath(pathname)) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return finalizeResponse(NextResponse.redirect(loginUrl), request, pathname, ctx);
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
    return redirectWithCookies(loginUrl, res, pathname, request, ctx);
  }

  if (isPublicPath(pathname)) {
    if (session?.access_token && AUTH_ENTRY_PATHS.has(pathname)) {
      const nextPath = await resolvePostAuthPath(session.access_token, request);
      if (nextPath && nextPath !== "/auth/login") {
        return redirectWithCookies(new URL(nextPath, request.url), res, pathname, request, ctx);
      }
    }
    return res;
  }

  if (isOnboardingPath(pathname)) {
    if (session?.access_token) {
      const user = await fetchAuthProfile(session.access_token, request);
      if (user && isProfileComplete(user) && ROLE_HOME[user.role]) {
        return redirectWithCookies(new URL(ROLE_HOME[user.role], request.url), res, pathname, request, ctx);
      }
    }
    return res;
  }

  const requiredRole = getRoleForPath(pathname);

  if (session?.access_token && requiredRole) {
    const user = await fetchAuthProfile(session.access_token, request);

    if (!user?.role || !isProfileComplete(user)) {
      return redirectWithCookies(new URL("/onboarding", request.url), res, pathname, request, ctx);
    }

    if (!roleAllowedForPath(user.role, requiredRole)) {
      const dest = ROLE_HOME[user.role] || "/auth/login";
      return redirectWithCookies(new URL(dest, request.url), res, pathname, request, ctx);
    }

    if (pathname.startsWith("/student/study-rooms")) {
      try {
        const { data: hasAccess } = await supabase.rpc("has_room_access", {
          p_user_id: user.id
        });
        if (hasAccess === false) {
          const subscribeUrl = new URL("/student/subscription", request.url);
          subscribeUrl.searchParams.set("reason", "study_rooms");
          subscribeUrl.searchParams.set("redirect", pathname);
          return redirectWithCookies(subscribeUrl, res, pathname, request, ctx);
        }
      } catch {
        // On RPC failure, allow through — backend enforces the gate
      }
    }
  }

  if (pathname === "/dashboard" && session?.access_token) {
    const nextPath =
      (await resolvePostAuthPath(session.access_token, request)) ?? "/onboarding";
    return redirectWithCookies(new URL(nextPath, request.url), res, pathname, request, ctx);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
