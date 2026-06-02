import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { ROLE_HOME } from "@/lib/role-routes-server";

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

function roleFromSession(session) {
  const user = session?.user;
  return user?.user_metadata?.role || user?.app_metadata?.role || null;
}

async function resolveUserRole(supabase, session) {
  const metaRole = roleFromSession(session);
  if (metaRole) return metaRole;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  return profile?.role || null;
}

export async function middleware(request) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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
    return response;
  }

  const protectedRoutes = ["/student", "/teacher", "/parent", "/admin", "/onboarding"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const requiredRole = Object.entries(ROLE_PREFIXES).find(([prefix]) => pathname.startsWith(prefix))?.[1];
  if (session && requiredRole) {
    try {
      const userRole = await resolveUserRole(supabase, session);
      if (userRole && userRole !== requiredRole) {
        const destination = ROLE_HOME[userRole] || "/onboarding";
        return NextResponse.redirect(new URL(destination, request.url));
      }
    } catch (_err) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  if (pathname.startsWith("/auth") && session) {
    try {
      const metaRole = roleFromSession(session);
      const metaName = session.user?.user_metadata?.full_name;

      if (metaRole && metaName && ROLE_HOME[metaRole]) {
        return NextResponse.redirect(new URL(ROLE_HOME[metaRole], request.url));
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      const destination =
        profile?.role && profile?.full_name && ROLE_HOME[profile.role]
          ? ROLE_HOME[profile.role]
          : "/onboarding";
      return NextResponse.redirect(new URL(destination, request.url));
    } catch (_err) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
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
