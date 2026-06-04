import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
    console.error("Auth callback error: missing Supabase env");
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback error:", error.message);
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Auth callback error:", userError?.message || "no user after exchange");
    const loginResponse = NextResponse.redirect(new URL("/auth/login", origin));
    applyCookiesToResponse(loginResponse, pendingAuthCookies);
    return loginResponse;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log(
    "Auth callback - user:",
    user.id,
    "profile:",
    profile,
    "error:",
    profileError?.message || profileError
  );

  const redirectPath = ROLE_REDIRECTS[profile?.role] || "/student/dashboard";
  const response = NextResponse.redirect(new URL(redirectPath, origin));
  applyCookiesToResponse(response, pendingAuthCookies);

  return response;
}
