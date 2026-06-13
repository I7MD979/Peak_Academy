/**
 * Create idempotent k6 load-test student accounts (no admin privileges).
 *
 * Usage (from backend/):
 *   npm run setup:loadtest
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY in backend/.env
 * (same project as production — run load tests against staging URLs only).
 */
import { createClient } from "@supabase/supabase-js";
import { loadSeedEnv } from "./load-seed-env.mjs";
import { ensureUserProfile } from "../src/utils/ensure-user-profile.js";

const LOAD_TEST_USERS = [
  {
    email: "loadtest1@test.com",
    password: "TestPass123!",
    full_name: "Load Test Student 1",
    grade: "sec_third"
  },
  {
    email: "loadtest2@test.com",
    password: "TestPass123!",
    full_name: "Load Test Student 2",
    grade: "sec_second"
  },
  {
    email: "loadtest3@test.com",
    password: "TestPass123!",
    full_name: "Load Test Student 3",
    grade: "sec_first"
  }
];

const { url, serviceKey } = loadSeedEnv();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function log(step, detail = "") {
  console.info(detail ? `  ✓ ${step}: ${detail}` : `  ✓ ${step}`);
}

async function ensureLoadTestStudent({ email, password, full_name, grade }) {
  const normalizedEmail = email.toLowerCase();
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = listed.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
  let userId = existing?.id;

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { role: "student", full_name }
    });
    if (updateError) throw updateError;
    log("auth user", `updated ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { role: "student", full_name }
    });
    if (error) throw error;
    userId = data.user.id;
    log("auth user", `created ${email}`);
  }

  await ensureUserProfile(supabase, {
    id: userId,
    email: normalizedEmail,
    full_name,
    role: "student",
    grade
  });

  await supabase
    .from("users")
    .update({ role: "student", is_active: true, is_verified: true })
    .eq("id", userId);

  log("profile", `${email} → student (${grade})`);
  return userId;
}

async function main() {
  console.info("\nCreating k6 load-test student accounts...\n");

  for (const user of LOAD_TEST_USERS) {
    await ensureLoadTestStudent(user);
  }

  console.info("\nDone. Accounts ready for peak-load-test.js:\n");
  for (const user of LOAD_TEST_USERS) {
    console.info(`  ${user.email} / ${user.password}`);
  }
  console.info("");
}

main().catch((err) => {
  console.error("\nSetup failed:", err?.message || err);
  process.exit(1);
});
