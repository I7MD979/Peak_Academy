import { NextResponse } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

// Routes that require an active subscription or free trial
const STUDY_ROOM_PATHS = ["/student/study-rooms"];

export async function middleware(request) {
  const { response, supabase, user } = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

  const isStudyRoomRoute = STUDY_ROOM_PATHS.some((p) => pathname.startsWith(p));

  if (!isStudyRoomRoute) {
    return response;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check study room access via DB function
  // has_room_access() handles: teachers (always yes), trialing, active-paid
  try {
    const { data: hasAccess, error } = await supabase.rpc("has_room_access", {
      p_user_id: user.id
    });

    if (!error && hasAccess === false) {
      const subscribeUrl = new URL("/student/subscription", request.url);
      subscribeUrl.searchParams.set("reason", "study_rooms");
      subscribeUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(subscribeUrl);
    }
  } catch {
    // On RPC failure, allow through — the backend will enforce the gate
  }

  return response;
}

export const config = {
  matcher: ["/student/study-rooms/:path*"]
};
