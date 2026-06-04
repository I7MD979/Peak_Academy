import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROLE_REDIRECTS = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard"
};

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
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[callback] user error:", userError?.message);
      const loginResponse = NextResponse.redirect(new URL("/auth/login", origin));
      applyCookiesToResponse(loginResponse, pendingAuthCookies);
      return loginResponse;
    }

    // Brief wait for handle_new_user trigger after Google OAuth
    await new Promise((resolve) => setTimeout(resolve, 300));

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log("[callback] user_id:", user.id, "role:", profile?.role);

    const redirectPath = profile?.role
      ? ROLE_REDIRECTS[profile.role] || "/student/dashboard"
      : "/student/dashboard";

    const response = NextResponse.redirect(new URL(redirectPath, origin));
    applyCookiesToResponse(response, pendingAuthCookies);
    return response;
  } catch (err) {
    console.error("[callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/auth/login", origin));
  }
}
