import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolvePostAuthPath } from "@/lib/role-routes-edge";
import { appendNextParam, readNextParam } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

function applyCookiesToResponse(target, cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    target.cookies.set(name, value, options);
  });
}

function getBackendUrl() {
  // Server-side: use internal URL env or fallback
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://peakacademy-production.up.railway.app/api"
    : "http://localhost:4000/api";
}

async function exchangeOneTimeToken(token) {
  const res = await fetch(`${getBackendUrl()}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
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

  const cookieStore = cookies();
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
  if (oneTimeToken) {
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
      const code = err.code || "exchange_failed";
      console.error("[callback] token exchange error:", err.message);
      return NextResponse.redirect(new URL(`/auth/login?error=${code}`, origin));
    }
  }

  // ── Path 2: Supabase code exchange (magic link / email OTP fallback) ───────
  const code = requestUrl.searchParams.get("code");
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
