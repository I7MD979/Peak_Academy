import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Refreshes the Supabase session and returns a NextResponse with updated cookies.
 * Uses getAll/setAll (required by @supabase/ssr on the server).
 */
export async function updateSupabaseSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, supabase: null, user: null, accessToken: null };
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      return { response, supabase, user: null, accessToken: null };
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    return {
      response,
      supabase,
      user: user ?? null,
      accessToken: session?.access_token ?? null
    };
  } catch {
    return { response, supabase: null, user: null, accessToken: null };
  }
}
