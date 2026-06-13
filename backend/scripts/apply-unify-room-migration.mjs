/**
 * Applies 20260703_unify_room_channel_and_files.sql to remote Supabase Postgres.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = (process.env.SUPABASE_URL || "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const migrationPath = path.join(
  __dirname,
  "../supabase/migrations/20260703_unify_room_channel_and_files.sql"
);
const sql = fs.readFileSync(migrationPath, "utf8");

const POOLER_REGIONS = (process.env.SUPABASE_DB_REGION || "eu-west-2,eu-central-1,us-east-1").split(",");

function buildPoolerUrl(ref, password, region) {
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region.trim()}.pooler.supabase.com:5432/postgres`;
}

async function runViaPg() {
  if (process.env.DATABASE_URL) {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    try {
      await client.query(sql);
    } finally {
      await client.end();
    }
    return;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !PROJECT_REF) {
    throw new Error(
      "Set DATABASE_URL or SUPABASE_DB_PASSWORD in backend/.env (Supabase → Settings → Database → password)"
    );
  }

  let lastError;
  for (const region of POOLER_REGIONS) {
    const connectionString = buildPoolerUrl(PROJECT_REF, password, region);
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log(`Migration applied via pooler (${region.trim()}).`);
      return;
    } catch (err) {
      lastError = err;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError || new Error("Could not connect to Supabase Postgres pooler");
}

async function runViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token || !PROJECT_REF) {
    throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_URL required for Management API");
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body}`);
  }
  console.log("Migration applied via Management API.");
}

async function verify() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { error } = await supabase.from("study_room_messages").select("file_url, file_name").limit(1);
  if (error) throw new Error(`Verify failed: ${error.message}`);
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.id === "study-room-files")) {
    throw new Error("Verify failed: study-room-files bucket not found");
  }
  console.log("Verified: file columns and study-room-files bucket are available.");
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.error("Missing SUPABASE_URL in backend/.env");
    process.exit(1);
  }

  if (process.env.SUPABASE_ACCESS_TOKEN) {
    await runViaManagementApi();
  } else {
    await runViaPg();
  }

  console.log("\nReload PostgREST schema: Supabase Dashboard → Settings → API → Reload schema");

  if (process.env.SUPABASE_SERVICE_KEY) {
    await new Promise((r) => setTimeout(r, 2000));
    await verify();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
