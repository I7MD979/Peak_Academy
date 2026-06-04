import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PROD_DOMAIN = "peak-academy.net";
const PREVIEW_USER = "peak";
const PREVIEW_PASS = "D@rkwh@le_123";

const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password"
];

const ROLE_ROUTES = {
  "/student": "student",
  "/teacher": "teacher",
  "/parent": "parent",
  "/admin": "admin"
};

const ROLE_REDIRECTS = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard"
};

function isPublicPath(path) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function getRoleForPath(path) {
  for (const [prefix, role] of Object.entries(ROLE_ROUTES)) {
    if (path.startsWith(prefix)) return role;
  }
  return null;
}

function checkBasicAuth(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authHeader.slice(6));
    return decoded === `${PREVIEW_USER}:${PREVIEW_PASS}`;
  } catch {
    return false;
  }
}

function copyCookies(from, to) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  const isProdDomain = host === PROD_DOMAIN || host === `www.${PROD_DOMAIN}`;
  const isPreviewUrl = host.includes(".vercel.app") && !host.includes("-kappa.");

  if (!isProdDomain && isPreviewUrl && !checkBasicAuth(request)) {
    return new NextResponse("Peak Academy — Preview Access Required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Peak Academy Preview"',
        "Content-Type": "text/plain"
      }
    });
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
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
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== requiredRole) {
      const correctPath = ROLE_REDIRECTS[profile?.role] || "/auth/login";
      const redirect = NextResponse.redirect(new URL(correctPath, request.url));
      copyCookies(res, redirect);
      return redirect;
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|peak-api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)"
  ]
};
