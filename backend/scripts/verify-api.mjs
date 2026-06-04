const base = process.env.API_BASE || "http://localhost:4000";

const health = await fetch(`${base}/api/health`);
const healthBody = await health.json();
const version = health.headers.get("x-peak-api-version") || healthBody.api_version;

console.log("health status:", health.status);
console.log("api_version:", version);

if (!health.ok || !String(version).includes("2026-06-09-schema-v2")) {
  console.error("\nBackend is NOT on the latest API. Run from backend/: npm run restart");
  process.exit(1);
}

const sessions = await fetch(`${base}/api/sessions?status=all&limit=1&page=1`);
console.log("sessions (no auth) status:", sessions.status, "(expect 401)");

console.log("\nOK — backend schema v2. If the browser still shows 503, stop all old terminals and run: npm run dev");
