import "dotenv/config";
import app, { API_VERSION } from "./app.js";
import { initSentry } from "./lib/sentry.js";
import { startWorkers, shutdownWorkers } from "./lib/queue.js";
import { getCacheMode } from "./lib/cache.js";

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV === "production" && !process.env.PAYMOB_HMAC_SECRET) {
  console.warn(
    "WARNING: PAYMOB_HMAC_SECRET is not set — Paymob webhooks will be rejected until configured."
  );
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — set them in backend/.env");
  process.exit(1);
}

await initSentry();

const server = app.listen(PORT, () => {
  console.log("========================================");
  console.log(`Peak Academy API  ${API_VERSION}`);
  console.log(`http://localhost:${PORT}/api/health`);
  console.log(`http://localhost:${PORT}/api/diag`);
  console.log(`Cache mode: ${getCacheMode()}`);
  console.log("========================================");
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

await startWorkers();

async function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  await shutdownWorkers();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
