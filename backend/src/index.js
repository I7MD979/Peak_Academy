import "dotenv/config";

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";

function requireProductionEnv() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_KEY");
  if (missing.length) {
    console.error("========================================");
    console.error("Peak Academy API failed to start.");
    console.error(`Missing: ${missing.join(", ")}`);
    console.error("Add them in Railway → your service → Variables.");
    console.error("========================================");
    process.exit(1);
  }
}

requireProductionEnv();

if (process.env.NODE_ENV === "production" && !process.env.PAYMOB_HMAC_SECRET) {
  console.warn(
    "WARNING: PAYMOB_HMAC_SECRET is not set — Paymob webhooks will be rejected until configured."
  );
}

const { default: app, API_VERSION } = await import("./app.js");
const { initSentry } = await import("./lib/sentry.js");
const { startWorkers, shutdownWorkers } = await import("./lib/queue.js");
const { getCacheMode } = await import("./lib/cache.js");
const { startSubscriptionResetScheduler } = await import("./services/subscriptionScheduler.js");

await initSentry();

const server = app.listen(PORT, HOST, () => {
  console.log("========================================");
  console.log(`Peak Academy API  ${API_VERSION}`);
  console.log(`Listening on http://${HOST}:${PORT}`);
  console.log(`Health: http://${HOST}:${PORT}/api/health`);
  console.log(`Cache mode: ${getCacheMode()}`);
  console.log("========================================");
});

server.on("error", (err) => {
  console.error("Server failed to bind:", err.message);
  process.exit(1);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

startWorkers().catch((err) => {
  console.error("Queue workers failed to start:", err.message);
});

startSubscriptionResetScheduler();

await import("./jobs/sessionReminders.js");

async function shutdown(signal) {
  console.log(`${signal} received — shutting down`);
  await shutdownWorkers();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
