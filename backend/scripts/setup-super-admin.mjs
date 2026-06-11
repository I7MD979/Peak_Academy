/**
 * Purge Peak Academy demo/test data and ensure a single super-admin account.
 *
 * Usage (from backend/):
 *   npm run setup:admin
 */
import { createClient } from "@supabase/supabase-js";
import { loadSeedEnv } from "./load-seed-env.mjs";
import { ensureUserProfile } from "../src/utils/ensure-user-profile.js";

const TEST_EMAILS = [
  "admin@peak.com",
  "teacher@peak.com",
  "student@peak.com",
  "parent@peak.com"
];

const DEMO_ROOM_IDS = ["demo-room-math-third", "demo-room-physics-third"];
const DEMO_SESSION_IDS = [
  "a1000001-0000-4000-8000-000000000001",
  "a1000002-0000-4000-8000-000000000002"
];
const DEMO_ENROLLMENT_IDS = ["demo-enr-scheduled", "demo-enr-completed"];
const DEMO_QUESTION_IDS = ["demo-question-open", "demo-question-answered"];
const DEMO_WITHDRAWAL_ID = "demo-withdrawal-001";
const DEMO_MEMBER_ID = "demo-member-student-math";
const DEMO_PROMO_CODES = ["DEMO20"];

const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL || "ahmedmohamed123905@gmail.com",
  password: process.env.SUPER_ADMIN_PASSWORD || "Ah@0144473536",
  role: "admin",
  full_name: process.env.SUPER_ADMIN_NAME || "أحمد محمد"
};

const { url, serviceKey } = loadSeedEnv();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function log(step, detail = "") {
  console.info(detail ? `  ✓ ${step}: ${detail}` : `  ✓ ${step}`);
}

function warn(step, detail) {
  console.warn(`  ⚠ ${step}: ${detail}`);
}

async function safeDelete(table, filter) {
  const { error } = await supabase.from(table).delete().match(filter);
  if (error) warn(table, error.message);
}

async function safeDeleteIn(table, column, values) {
  if (!values.length) return;
  const { error } = await supabase.from(table).delete().in(column, values);
  if (error) warn(table, error.message);
}

async function purgeDemoRecords() {
  await safeDeleteIn("study_room_messages", "room_id", DEMO_ROOM_IDS);
  await safeDeleteIn("study_room_members", "room_id", DEMO_ROOM_IDS);
  await safeDelete("study_room_members", { id: DEMO_MEMBER_ID });
  await safeDeleteIn("study_rooms", "id", DEMO_ROOM_IDS);

  await safeDeleteIn("enrollments", "id", DEMO_ENROLLMENT_IDS);
  await safeDeleteIn("session_enrollments", "id", DEMO_ENROLLMENT_IDS);
  await safeDeleteIn("enrollments", "session_id", DEMO_SESSION_IDS);
  await safeDeleteIn("session_enrollments", "session_id", DEMO_SESSION_IDS);
  await safeDeleteIn("sessions", "id", DEMO_SESSION_IDS);

  await safeDeleteIn("questions", "id", DEMO_QUESTION_IDS);
  await safeDelete("withdrawals", { id: DEMO_WITHDRAWAL_ID });
  await safeDeleteIn("withdrawal_requests", "id", [DEMO_WITHDRAWAL_ID]);
  await safeDeleteIn("promotions", "code", DEMO_PROMO_CODES);

  log("demo records", "purged known demo IDs and DEMO20");
}

async function purgeUserScopedData(userId) {
  const scopedDeletes = [
    ["study_room_messages", "sender_id"],
    ["study_room_members", "user_id"],
    ["raise_hand_queue", "user_id"],
    ["student_subscriptions", "student_id"],
    ["enrollments", "student_id"],
    ["session_enrollments", "student_id"],
    ["questions", "student_id"],
    ["questions", "teacher_id"],
    ["withdrawals", "teacher_id"],
    ["withdrawal_requests", "teacher_id"],
    ["teacher_earnings", "teacher_id"],
    ["monthly_payouts", "teacher_id"],
    ["teacher_room_commissions", "teacher_id"],
    ["reviews", "student_id"],
    ["reviews", "teacher_id"],
    ["notifications", "user_id"],
    ["payments", "user_id"],
    ["parent_children", "parent_id"],
    ["parent_children", "student_id"],
    ["parent_links", "parent_id"],
    ["parent_links", "student_id"],
    ["teacher_profiles", "user_id"],
    ["student_profiles", "user_id"],
    ["referral_codes", "user_id"],
    ["user_permissions", "user_id"]
  ];

  for (const [table, column] of scopedDeletes) {
    await safeDelete(table, { [column]: userId });
  }

  await safeDelete("sessions", { teacher_id: userId });
  await safeDelete("study_rooms", { teacher_id: userId });
}

async function deleteTestUsers() {
  for (const email of TEST_EMAILS) {
    const { data: row, error } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      warn("lookup user", `${email}: ${error.message}`);
      continue;
    }
    if (!row?.id) continue;

    await purgeUserScopedData(row.id);
    await safeDelete("users", { id: row.id });

    const { error: authErr } = await supabase.auth.admin.deleteUser(row.id);
    if (authErr) warn("auth delete", `${email}: ${authErr.message}`);
    else log("removed test user", email);
  }
}

async function ensureSuperAdmin() {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const email = SUPER_ADMIN.email.toLowerCase();
  const existing = listed.users.find((u) => u.email?.toLowerCase() === email);
  let userId = existing?.id;

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: { role: SUPER_ADMIN.role, full_name: SUPER_ADMIN.full_name }
    });
    if (updateError) throw updateError;
    log("super admin", `updated auth: ${SUPER_ADMIN.email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
      user_metadata: { role: SUPER_ADMIN.role, full_name: SUPER_ADMIN.full_name }
    });
    if (error) throw error;
    userId = data.user.id;
    log("super admin", `created auth: ${SUPER_ADMIN.email}`);
  }

  await ensureUserProfile(supabase, {
    id: userId,
    email: SUPER_ADMIN.email,
    full_name: SUPER_ADMIN.full_name,
    role: SUPER_ADMIN.role
  });

  await supabase
    .from("users")
    .update({ role: "admin", is_active: true, is_verified: true })
    .eq("id", userId);

  log("super admin", "profile ready (role: admin)");
  return userId;
}

async function main() {
  console.info("\nPurging demo/test data and configuring super admin...\n");

  await purgeDemoRecords();
  await deleteTestUsers();
  await ensureSuperAdmin();

  console.info("\nDone.\n");
  console.info("Super admin:");
  console.info(`  ${SUPER_ADMIN.email}`);
  console.info(`  role: admin (full access)`);
  console.info("");
}

main().catch((err) => {
  console.error("\nSetup failed:", err?.message || err);
  process.exit(1);
});
