import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolvePostAuthPath } from "@/lib/role-routes-edge";
import { appendNextParam, readNextParam } from "@/lib/auth-redirect";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

function applyCookiesToResponse(target, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    target.cookies.set(name, value, options);
  });
}

function getBackendUrl() {
  // Server-side: strips trailing /api then re-appends it, so NEXT_PUBLIC_API_URL
  // can be "https://api.peak-academy.net/api" or "https://api.peak-academy.net"
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/api$/, "").replace(/\/$/, "") + "/api";
  return process.env.NODE_ENV === "production"
    ? "https://api.peak-academy.net/api"
    : "http://localhost:4000/api";
}

async function exchangeOneTimeToken(token) {
  const res = await fetch(`${getBackendUrl()}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || "exchange_failed"), { status: res.status, code: body.error });
  }

  return res.json(); // { access_token, refresh_token, expires_in, user }
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[callback] missing Supabase env");
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  const cookieStore = await cookies();
  let pendingAuthCookies = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        pendingAuthCookies = cookiesToSet;
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      }
    }
  });

  // ── Path 1: One-time JWT from our backend (Google OAuth) ──────────────────
  const oneTimeToken = requestUrl.searchParams.get("token");
  const code = requestUrl.searchParams.get("code");
  if (oneTimeToken && !code) {
    try {
      const sessionData = await exchangeOneTimeToken(oneTimeToken);

      const { error: setError } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });

      if (setError) {
        console.error("[callback] setSession error:", setError.message);
        return NextResponse.redirect(new URL("/auth/login?error=session_failed", origin));
      }

      const nextReturn = readNextParam(requestUrl.searchParams);
      let redirectPath =
        (await resolvePostAuthPath(sessionData.access_token, request)) || "/onboarding";

      if (redirectPath === "/onboarding" && nextReturn) {
        redirectPath = appendNextParam("/onboarding", nextReturn);
      } else if (nextReturn && redirectPath !== "/onboarding" && redirectPath !== "/auth/login") {
        redirectPath = nextReturn;
      }

      const response = NextResponse.redirect(new URL(redirectPath, origin));
      applyCookiesToResponse(response, pendingAuthCookies);
      return response;
    } catch (err) {
      const errCode = err.code || "exchange_failed";
      console.error("[callback] token exchange error:", err.message);
      return NextResponse.redirect(new URL(`/auth/login?error=${errCode}`, origin));
    }
  }

  // ── Path 2: Supabase code exchange (magic link / email OTP fallback) ───────
  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  try {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      console.error("[callback] session error:", sessionError.message);
      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", "oauth_failed");
      return NextResponse.redirect(loginUrl);
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }

    const nextReturn = readNextParam(requestUrl.searchParams);
    let redirectPath =
      (await resolvePostAuthPath(session.access_token, request)) || "/onboarding";

    if (redirectPath === "/onboarding" && nextReturn) {
      redirectPath = appendNextParam("/onboarding", nextReturn);
    } else if (nextReturn && redirectPath !== "/onboarding" && redirectPath !== "/auth/login") {
      redirectPath = nextReturn;
    }

    const response = NextResponse.redirect(new URL(redirectPath, origin));
    applyCookiesToResponse(response, pendingAuthCookies);
    return response;
  } catch (err) {
    console.error("[callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth/login", origin));
  }
}

export async function POST(request) {
  const origin = new URL(request.url).origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/auth/login?error=config_error", origin));
  }

  try {
    const formData = await request.formData();
    const rawToken = formData.get("t");
    const rawNext = formData.get("n");

    if (!rawToken) {
      return NextResponse.redirect(new URL("/auth/login?error=missing_token", origin));
    }

    let token;
    try {
      token = Buffer.from(String(rawToken), "base64url").toString("utf8");
    } catch {
      return NextResponse.redirect(new URL("/auth/login?error=token_decode_failed", origin));
    }

    let returnTo = null;
    if (rawNext) {
      try {
        returnTo = Buffer.from(String(rawNext), "base64url").toString("utf8");
      } catch { /* ignore */ }
    }

    const cookieStore = await cookies();
    let pendingAuthCookies = [];
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          pendingAuthCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        }
      }
    });

    const sessionData = await exchangeOneTimeToken(token);

    const { error: setError } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token
    });

    if (setError) {
      console.error("[callback POST] setSession error:", setError.message);
      return NextResponse.redirect(new URL("/auth/login?error=session_failed", origin));
    }

    const nextReturn = returnTo ? sanitizeRedirectPath(returnTo) : null;
    let redirectPath =
      (await resolvePostAuthPath(sessionData.access_token, request)) || "/onboarding";

    if (redirectPath === "/onboarding" && nextReturn) {
      redirectPath = appendNextParam("/onboarding", nextReturn);
    } else if (nextReturn && redirectPath !== "/onboarding" && redirectPath !== "/auth/login") {
      redirectPath = nextReturn;
    }

    const response = NextResponse.redirect(new URL(redirectPath, origin));
    applyCookiesToResponse(response, pendingAuthCookies);
    return response;
  } catch (err) {
    const errCode = err.code || "exchange_failed";
    console.error("[callback POST] error:", err.message);
    return NextResponse.redirect(new URL(`/auth/login?error=${errCode}`, origin));
  }
}
