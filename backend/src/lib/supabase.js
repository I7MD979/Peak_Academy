import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

function decodeJwtRole(key) {
  try {
    const part = String(key || "").split(".")[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return json?.role || null;
  } catch {
    return null;
  }
}

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

const keyRole = decodeJwtRole(supabaseServiceKey);
if (keyRole === "anon") {
  console.error(
    "[supabase] SUPABASE_SERVICE_KEY looks like the anon key. Use the service_role secret from Supabase Dashboard → Settings → API."
  );
} else if (keyRole && keyRole !== "service_role") {
  console.warn(`[supabase] unexpected JWT role in service key: ${keyRole}`);
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
