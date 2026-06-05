/**
 * One-time cleanup: delete Daily.co rooms not linked to a live session in DB.
 *
 * Usage (from backend/):
 *   node scripts/cleanup-daily.js
 *
 * Requires DAILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).
 */
import "dotenv/config";
import { supabase } from "../src/lib/supabase.js";
import { cleanupOrphanedDailyRooms } from "../src/services/daily.service.js";

async function main() {
  if (!process.env.DAILY_API_KEY) {
    console.error("DAILY_API_KEY is not set.");
    process.exit(1);
  }

  console.log("[cleanup-daily] scanning orphaned session-* rooms...");
  const result = await cleanupOrphanedDailyRooms(supabase);

  console.log(
    JSON.stringify(
      {
        deleted: result.deleted?.length || 0,
        failed: result.failed?.length || 0,
        room_names: result.deleted || []
      },
      null,
      2
    )
  );

  if ((result.failed?.length || 0) > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[cleanup-daily] failed:", err?.message || err);
  process.exit(1);
});
