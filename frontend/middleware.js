import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  ROLE_HOME,
  resolvePostAuthPath
} from "@/lib/role-routes-server";

const ROLE_PREFIXES = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/student": "student",
  "/parent": "parent"
};

function createSupabaseForRequest(request, response) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set(name, value, options);
      },
      remove(name, options) {
        response.cookies.set(name, "", options);
      }
    }
  });
}

export async function middleware(request) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const protectedRoutes = ["/student", "/teacher", "/parent", "/admin", "/onboarding"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return response;
  }

  let session = null;
  let supabase = null;
  try {
    supabase = createSupabaseForRequest(request, response);
    const {
      data: { session: currentSession }
    } = await supabase.auth.getSession();
    session = currentSession;
  } catch (_err) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return response;
  }

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const requiredRole = Object.entries(ROLE_PREFIXES).find(([prefix]) => pathname.startsWith(prefix))?.[1];
  if (session && requiredRole) {
    try {
      const profile = await fetchAuthProfile(session.access_token);

      if (!profile?.role || !isProfileComplete(profile)) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }

      if (profile.role !== requiredRole) {
        const destination = ROLE_HOME[profile.role] || "/onboarding";
        return NextResponse.redirect(new URL(destination, request.url));
      }
    } catch (_err) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  if (pathname.startsWith("/auth") && session) {
    try {
      const destination = await resolvePostAuthPath(supabase, session.access_token);
      return NextResponse.redirect(new URL(destination, request.url));
    } catch (_err) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  if (pathname.startsWith("/onboarding") && session?.access_token) {
    try {
      const destination = await resolvePostAuthPath(supabase, session.access_token);
      if (destination !== "/onboarding") {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    } catch {
      // stay on onboarding
    }
  }

  if (pathname === "/" && session?.access_token) {
    try {
      const destination = await resolvePostAuthPath(supabase, session.access_token);
      if (destination !== "/onboarding" && destination !== "/auth/login") {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    } catch {
      // stay on landing
    }
  }

  if (pathname === "/dashboard") {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    try {
      const destination = await resolvePostAuthPath(supabase, session.access_token);
      return NextResponse.redirect(new URL(destination, request.url));
    } catch {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/onboarding",
    "/auth/login",
    "/auth/register",
    "/auth/callback"
  ]
};
