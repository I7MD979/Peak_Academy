/**
 * One-time cleanup: delete LiveKit rooms not linked to a live session in DB.
 *
 * Usage (from backend/):
 *   node scripts/cleanup-livekit.js
 */
import "dotenv/config";
import { supabase } from "../src/lib/supabase.js";
import { cleanupOrphanedLiveKitRooms, isLiveKitConfigured } from "../src/services/livekit.service.js";

async function main() {
  if (!isLiveKitConfigured()) {
    console.error("LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required.");
    process.exit(1);
  }

  console.log("[cleanup-livekit] scanning orphaned session-* rooms...");
  const result = await cleanupOrphanedLiveKitRooms(supabase);

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
  console.error("[cleanup-livekit] failed:", err?.message || err);
  process.exit(1);
});
