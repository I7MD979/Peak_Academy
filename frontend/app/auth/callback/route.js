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

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[callback] missing Supabase env");
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  try {
    const cookieStore = cookies();
    let pendingAuthCookies = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingAuthCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    });

    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      console.error("[callback] session error:", sessionError.message);
      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", "oauth_failed");
      return NextResponse.redirect(loginUrl);
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

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
