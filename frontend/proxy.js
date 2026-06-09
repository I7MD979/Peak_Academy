import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  resolvePostAuthPath,
  ROLE_HOME
} from "./lib/role-routes-edge.js";

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
  "/admin": "admin"
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

function redirectWithCookies(url, res) {
  const redirect = NextResponse.redirect(url);
  res.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return redirect;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  let res = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!isPublicPath(pathname)) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
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
    return redirectWithCookies(loginUrl, res);
  }

  if (isPublicPath(pathname)) {
    if (session?.access_token && AUTH_ENTRY_PATHS.has(pathname)) {
      const nextPath = await resolvePostAuthPath(session.access_token, request);
      if (nextPath && nextPath !== "/auth/login") {
        return redirectWithCookies(new URL(nextPath, request.url), res);
      }
    }
    return res;
  }

  if (isOnboardingPath(pathname)) {
    if (session?.access_token) {
      const user = await fetchAuthProfile(session.access_token, request);
      if (user && isProfileComplete(user) && ROLE_HOME[user.role]) {
        return redirectWithCookies(new URL(ROLE_HOME[user.role], request.url), res);
      }
    }
    return res;
  }

  const requiredRole = getRoleForPath(pathname);

  if (session?.access_token && requiredRole) {
    const user = await fetchAuthProfile(session.access_token, request);

    if (!user?.role || !isProfileComplete(user)) {
      return redirectWithCookies(new URL("/onboarding", request.url), res);
    }

    if (user.role !== requiredRole) {
      const dest = ROLE_HOME[user.role] || "/auth/login";
      return redirectWithCookies(new URL(dest, request.url), res);
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
          return redirectWithCookies(subscribeUrl, res);
        }
      } catch {
        // On RPC failure, allow through — backend enforces the gate
      }
    }
  }

  if (pathname === "/dashboard" && session?.access_token) {
    const nextPath =
      (await resolvePostAuthPath(session.access_token, request)) ?? "/onboarding";
    return redirectWithCookies(new URL(nextPath, request.url), res);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
