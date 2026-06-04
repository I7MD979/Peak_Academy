import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { ROLE_HOME } from "./lib/role-routes-edge.js";

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/callback",
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

/** Copy refreshed Supabase cookies from `res` onto a redirect response. */
function redirectWithCookies(url, res) {
  const redirect = NextResponse.redirect(url);
  res.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return redirect;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  let res = NextResponse.next({
    request: {
      headers: request.headers
    }
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

  // Refresh session and write updated auth cookies onto `res`
  await supabase.auth.getUser();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session && !isPublicPath(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithCookies(loginUrl, res);
  }

  if (isPublicPath(pathname)) {
    if (session?.user && AUTH_ENTRY_PATHS.has(pathname)) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.role && ROLE_HOME[profile.role]) {
        return redirectWithCookies(new URL(ROLE_HOME[profile.role], request.url), res);
      }
    }
    return res;
  }

  // /onboarding — session required, no role prefix check
  if (isOnboardingPath(pathname)) {
    return res;
  }

  const requiredRole = getRoleForPath(pathname);

  if (session && requiredRole) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role !== requiredRole) {
      const dest = ROLE_HOME[profile?.role] || "/auth/login";
      return redirectWithCookies(new URL(dest, request.url), res);
    }
  }

  if (pathname === "/dashboard" && session?.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.role && ROLE_HOME[profile.role]) {
      return redirectWithCookies(new URL(ROLE_HOME[profile.role], request.url), res);
    }
    return redirectWithCookies(new URL("/onboarding", request.url), res);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
