import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  ROLE_HOME,
  resolvePostAuthPath
} from "./lib/role-routes-edge.js";
import { updateSupabaseSession } from "./lib/supabase/middleware.js";

const ROLE_PREFIXES = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/student": "student",
  "/parent": "parent"
};

const PROTECTED_PREFIXES = ["/student", "/teacher", "/parent", "/admin", "/onboarding"];

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));
}

function redirectTo(path, request, sessionResponse) {
  try {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    if (sessionResponse) {
      sessionResponse.cookies.getAll().forEach(({ name, value }) => {
        redirect.cookies.set(name, value);
      });
    }
    return redirect;
  } catch {
    const fallback = NextResponse.redirect(new URL("/auth/login", request.url));
    if (sessionResponse) {
      sessionResponse.cookies.getAll().forEach(({ name, value }) => {
        fallback.cookies.set(name, value);
      });
    }
    return fallback;
  }
}

/** Avoid ERR_TOO_MANY_REDIRECTS when destination equals current path or bounces auth↔auth. */
function redirectIfNeeded(request, destination, sessionResponse, pathname) {
  if (!destination || destination === pathname) {
    return sessionResponse;
  }
  if (pathname.startsWith("/auth") && destination.startsWith("/auth")) {
    return sessionResponse;
  }
  return redirectTo(destination, request, sessionResponse);
}

async function handleSupabaseAuth(request) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/auth/callback") {
    const { response } = await updateSupabaseSession(request);
    return response;
  }

  const { response, user, accessToken } = await updateSupabaseSession(request);
  const isProtected = isProtectedPath(pathname);

  if (isProtected && !user) {
    return redirectTo("/auth/login", request, response);
  }

  const requiredRole = Object.entries(ROLE_PREFIXES).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1];

  if (user && requiredRole && accessToken) {
    const profile = await fetchAuthProfile(accessToken, request);

    if (!profile) {
      return response;
    }

    if (!profile.role || !isProfileComplete(profile)) {
      return redirectIfNeeded(request, "/onboarding", response, pathname);
    }

    if (profile.role !== requiredRole) {
      const destination = ROLE_HOME[profile.role] || "/onboarding";
      return redirectIfNeeded(request, destination, response, pathname);
    }
  }

  if (pathname.startsWith("/auth") && user) {
    const destination = await resolvePostAuthPath(accessToken, request);
    return redirectIfNeeded(request, destination, response, pathname);
  }

  if (pathname.startsWith("/onboarding") && accessToken) {
    const destination = await resolvePostAuthPath(accessToken, request);
    if (destination === null) {
      return redirectIfNeeded(request, "/auth/login", response, pathname);
    }
    return redirectIfNeeded(request, destination, response, pathname);
  }

  if (pathname === "/" && accessToken) {
    const destination = await resolvePostAuthPath(accessToken, request);
    if (
      destination &&
      destination !== "/onboarding" &&
      destination !== "/auth/login" &&
      destination !== pathname
    ) {
      return redirectTo(destination, request, response);
    }
  }

  if (pathname === "/dashboard") {
    if (!user) {
      return redirectTo("/auth/login", request, response);
    }
    const destination = await resolvePostAuthPath(accessToken, request);
    if (!destination || destination === "/auth/login") {
      return redirectTo("/auth/login", request, response);
    }
    return redirectIfNeeded(request, destination, response, pathname);
  }

  return response;
}

export async function middleware(request) {
  try {
    return await handleSupabaseAuth(request);
  } catch {
    const path = request.nextUrl.pathname;
    if (isProtectedPath(path)) {
      return redirectTo("/auth/login", request);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api).*)"]
};
