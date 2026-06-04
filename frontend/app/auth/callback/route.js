import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePostAuthPath } from "@/lib/role-routes-server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();
  const nextPath = await resolvePostAuthPath(supabase, session?.access_token);
  return NextResponse.redirect(new URL(nextPath, request.url));
}
