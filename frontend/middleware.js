import { NextResponse } from "next/server";
import {
  fetchAuthProfile,
  isProfileComplete,
  ROLE_HOME,
  resolvePostAuthPath
} from "./lib/role-routes-edge.js";
import { updateSupabaseSession } from "./lib/supabase/middleware.js";

const PROD_DOMAIN = "peak-academy.net";

const ROLE_PREFIXES = {
  "/admin": "admin",
  "/teacher": "teacher",
  "/student": "student",
  "/parent": "parent"
};

const PROTECTED_PREFIXES = ["/student", "/teacher", "/parent", "/admin", "/onboarding"];

function isProdHost(host) {
  return host === PROD_DOMAIN || host === `www.${PROD_DOMAIN}`;
}

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
    try {
      const profile = await fetchAuthProfile(accessToken);

      if (!profile?.role || !isProfileComplete(profile)) {
        return redirectTo("/onboarding", request, response);
      }

      if (profile.role !== requiredRole) {
        const destination = ROLE_HOME[profile.role] || "/onboarding";
        return redirectTo(destination, request, response);
      }
    } catch {
      return redirectTo("/auth/login", request, response);
    }
  }

  if (pathname.startsWith("/auth") && user) {
    try {
      const destination = await resolvePostAuthPath(accessToken);
      return redirectTo(destination, request, response);
    } catch {
      return redirectTo("/onboarding", request, response);
    }
  }

  if (pathname.startsWith("/onboarding") && accessToken) {
    try {
      const destination = await resolvePostAuthPath(accessToken);
      if (destination !== "/onboarding") {
        return redirectTo(destination, request, response);
      }
    } catch {
      // stay on onboarding
    }
  }

  if (pathname === "/" && accessToken) {
    try {
      const destination = await resolvePostAuthPath(accessToken);
      if (destination !== "/onboarding" && destination !== "/auth/login") {
        return redirectTo(destination, request, response);
      }
    } catch {
      // stay on landing
    }
  }

  if (pathname === "/dashboard") {
    if (!user) {
      return redirectTo("/auth/login", request, response);
    }
    try {
      const destination = await resolvePostAuthPath(accessToken);
      return redirectTo(destination, request, response);
    } catch {
      return redirectTo("/auth/login", request, response);
    }
  }

  return response;
}

export async function middleware(request) {
  const host = request.headers.get("host") || "";
  const path = request.nextUrl.pathname;
  const isProdDomain = isProdHost(host);

  if (isProdDomain && path !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProdDomain) {
    return NextResponse.next();
  }

  try {
    return await handleSupabaseAuth(request);
  } catch {
    if (isProtectedPath(path)) {
      return redirectTo("/auth/login", request);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
