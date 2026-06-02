import { createBrowserClient } from "@supabase/ssr";

const createMockClient = () => ({
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ data: null, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error("Supabase env vars are missing") }),
    signUp: async () => ({ data: null, error: new Error("Supabase env vars are missing") }),
    signOut: async () => ({})
  },
  from: () => ({ upsert: async () => ({ error: new Error("Supabase env vars are missing") }) })
});

let browserClient;

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return createMockClient();
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
};
