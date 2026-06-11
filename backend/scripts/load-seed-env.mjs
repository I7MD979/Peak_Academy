import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");
const frontendEnvPath = join(root, "..", "frontend", ".env.local");

const DEFAULT_SUPABASE_URL = "https://hpczrdvaeazrrrzgtatl.supabase.co";
const DASHBOARD_API_URL =
  "https://supabase.com/dashboard/project/hpczrdvaeazrrrzgtatl/settings/api";

function ensureEnvFile() {
  if (existsSync(envPath)) return;

  if (!existsSync(examplePath)) {
    writeFileSync(
      envPath,
      `PORT=4000\nNODE_ENV=development\nSUPABASE_URL=${DEFAULT_SUPABASE_URL}\nSUPABASE_SERVICE_KEY=\n`,
      "utf8"
    );
    console.log("Created backend/.env (minimal template)");
    return;
  }

  let content = readFileSync(examplePath, "utf8");
  if (!/^SUPABASE_URL=.+$/m.test(content)) {
    content = content.replace(/^SUPABASE_URL=$/m, `SUPABASE_URL=${DEFAULT_SUPABASE_URL}`);
  }
  writeFileSync(envPath, content, "utf8");
  console.log("Created backend/.env from .env.example");
}

function applyFrontendEnvFallback() {
  if (!existsSync(frontendEnvPath)) return;

  const content = readFileSync(frontendEnvPath, "utf8");
  if (!process.env.SUPABASE_URL) {
    const match = content.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
    if (match?.[1]?.trim()) process.env.SUPABASE_URL = match[1].trim();
  }
}

export function loadSeedEnv() {
  ensureEnvFile();
  config({ path: envPath });
  applyFrontendEnvFallback();

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();

  if (url && serviceKey) {
    return { url, serviceKey, envPath };
  }

  console.error("\n❌ Cannot run seed: Supabase credentials are missing.\n");
  console.error(`   File: ${envPath}`);
  console.error(`   SUPABASE_URL: ${url || "(missing)"}`);
  console.error(`   SUPABASE_SERVICE_KEY: ${serviceKey ? "(set)" : "(missing)"}\n`);
  console.error("Fix (choose one):\n");
  console.error("  1) Interactive setup:");
  console.error("       npm run setup:env\n");
  console.error("  2) Manual edit backend/.env and set:");
  console.error(`       SUPABASE_URL=${DEFAULT_SUPABASE_URL}`);
  console.error("       SUPABASE_SERVICE_KEY=<service_role secret>\n");
  console.error("Get the service_role key from:");
  console.error(`  ${DASHBOARD_API_URL}`);
  console.error("  → copy «service_role» (NOT anon, NOT JWT secret)\n");

  process.exit(1);
}
