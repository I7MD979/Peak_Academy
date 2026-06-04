import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  return { url, serviceKey };
}

const { url: supabaseUrl, serviceKey: supabaseServiceKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY)"
  );
}

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket;
}

const supabaseClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  realtime: { transport: WebSocket }
};

/** Service-role client — use supabase.auth.getUser(jwt) to verify user access tokens (not API keys). */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, supabaseClientOptions);
