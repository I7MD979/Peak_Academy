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
  "/auth/login",
  "/auth/register",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/setup-profile",
  "/onboarding"
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

function copyCookies(from, to) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

function redirectWithCookies(request, path, sessionResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  if (sessionResponse) copyCookies(sessionResponse, redirect);
  return redirect;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow onboarding while auth cookies are still propagating after OAuth callback
  if (isOnboardingPath(pathname)) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  if (isPublicPath(pathname)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!AUTH_ENTRY_PATHS.has(pathname) || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next();
    }

    const res = NextResponse.next({ request: { headers: request.headers } });
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

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const dest = await resolvePostAuthPath(session.access_token, request);
      if (dest && dest !== pathname && !dest.startsWith("/auth/login")) {
        return redirectWithCookies(request, dest, res);
      }
    }

    return res;
  }

  const res = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
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

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    copyCookies(res, redirect);
    return redirect;
  }

  const requiredRole = getRoleForPath(pathname);

  if (requiredRole) {
    const profile = await fetchAuthProfile(session.access_token, request);

    if (!profile?.role || !isProfileComplete(profile)) {
      return redirectWithCookies(request, "/onboarding", res);
    }

    if (profile.role !== requiredRole) {
      const correctPath = ROLE_HOME[profile.role] || "/onboarding";
      return redirectWithCookies(request, correctPath, res);
    }
  }

  if (pathname === "/dashboard") {
    const dest = await resolvePostAuthPath(session.access_token, request);
    if (dest && dest !== pathname) {
      return redirectWithCookies(request, dest, res);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
