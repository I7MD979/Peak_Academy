import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

function loadEnvFile() {
  if (!existsSync(envPath)) {
    copyFileSync(examplePath, envPath);
    console.log("Created backend/.env from .env.example");
  }
  return readFileSync(envPath, "utf8");
}

function getValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

function setValue(content, key, value) {
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, "m").test(content)) {
    return content.replace(new RegExp(`^${key}=.*$`, "m"), line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function mask(value) {
  if (!value || value.length < 12) return "(empty)";
  return `${value.slice(0, 8)}…${value.slice(-4)} (${value.length} chars)`;
}

let content = loadEnvFile();
const url = getValue(content, "SUPABASE_URL");
let serviceKey = getValue(content, "SUPABASE_SERVICE_KEY") || getValue(content, "SUPABASE_SERVICE_ROLE_KEY");
let anonKey = getValue(content, "SUPABASE_ANON_KEY");

console.log("");
console.log("Peak Academy — local env setup");
console.log("================================");
console.log(`File: ${envPath}`);
console.log(`SUPABASE_URL: ${url || "(missing)"}`);
console.log(`SUPABASE_SERVICE_KEY: ${mask(serviceKey)}`);
console.log("");

if (serviceKey) {
  console.log("SUPABASE_SERVICE_KEY is already set. Run: npm run dev");
  process.exit(0);
}

console.log("Get keys from Supabase Dashboard → Settings → API:");
console.log("https://supabase.com/dashboard/project/hpczrdvaeazrrrzgtatl/settings/api");
console.log("");
console.log("Copy the service_role secret (NOT anon, NOT JWT Secret).");
console.log("");

if (!url) {
  const defaultUrl = "https://hpczrdvaeazrrrzgtatl.supabase.co";
  const enteredUrl = await ask(`SUPABASE_URL [${defaultUrl}]: `);
  content = setValue(content, "SUPABASE_URL", enteredUrl || defaultUrl);
}

serviceKey = await ask("Paste SUPABASE_SERVICE_KEY (service_role): ");
if (!serviceKey) {
  console.error("\nNo key entered. Edit backend/.env manually and set SUPABASE_SERVICE_KEY=...");
  process.exit(1);
}

if (serviceKey.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(Buffer.from(serviceKey.split(".")[1], "base64url").toString("utf8"));
    if (payload.role === "anon") {
      console.error("\nThat looks like the anon key. Use service_role from the API settings page.");
      process.exit(1);
    }
  } catch {
    // ignore decode errors
  }
}

content = setValue(content, "SUPABASE_SERVICE_KEY", serviceKey);

if (!anonKey) {
  const enteredAnon = await ask("Paste SUPABASE_ANON_KEY (optional, press Enter to skip): ");
  if (enteredAnon) {
    content = setValue(content, "SUPABASE_ANON_KEY", enteredAnon);
  }
}

writeFileSync(envPath, content, "utf8");
console.log("\nSaved backend/.env");
console.log("Next: npm run dev");
