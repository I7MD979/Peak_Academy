import { createClient } from "@supabase/supabase-js";
import ws from "ws";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  // Node 20 (Railway Docker) has no global WebSocket — required by @supabase/realtime-js
  realtime: { transport: ws }
});
