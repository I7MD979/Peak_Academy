import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const createMockServerClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    exchangeCodeForSession: async () => ({ data: { session: null }, error: null })
  },
  from: () => {
    const empty = { data: [], error: null, count: 0 };
    const chain = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      order() {
        return chain;
      },
      range: async () => empty,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null })
    };
    return chain;
  }
});

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return createMockServerClient();

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set(name, value, options);
      },
      remove(name, options) {
        cookieStore.set(name, "", options);
      }
    }
  });
}
