import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
      return NextResponse.redirect(new URL("/auth/login", origin));
    }

    await supabase.auth.getSession();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", origin));
    }

    console.log("[callback] user_id:", user.id);

    let redirectPath = "/student/dashboard";
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      console.log("[callback] profile result:", JSON.stringify(profile));

      if (profile?.role === "teacher") redirectPath = "/teacher/dashboard";
      else if (profile?.role === "parent") redirectPath = "/parent/dashboard";
      else if (profile?.role === "admin") redirectPath = "/admin/dashboard";
      else redirectPath = "/student/dashboard";
    } catch (e) {
      console.error("[callback] profile fetch error:", e.message);
      redirectPath = "/student/dashboard";
    }

    console.log("[callback] final redirect:", redirectPath);
    const response = NextResponse.redirect(new URL(redirectPath, origin));
    applyCookiesToResponse(response, pendingAuthCookies);
    return response;
  } catch (err) {
    console.error("[callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth/login", origin));
  }
}
