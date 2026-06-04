import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ensureUserProfile } from "../src/utils/ensure-user-profile.js";

const users = [
  { email: "admin@peak.com", password: "Admin123!", role: "admin", full_name: "مدير المنصة" },
  { email: "teacher@peak.com", password: "Teacher123!", role: "teacher", full_name: "مدرس تجريبي" },
  { email: "student@peak.com", password: "Student123!", role: "student", full_name: "طالب تجريبي", grade: "third" },
  { email: "parent@peak.com", password: "Parent123!", role: "parent", full_name: "ولي أمر تجريبي" }
];

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function ensureAuthUser({ email, password, role, full_name }) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = listed.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { role, full_name }
    });
    if (updateError) throw updateError;
    console.log(`Updated auth: ${email}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name }
  });
  if (error) throw error;
  console.log(`Created auth: ${email}`);
  return data.user.id;
}

for (const user of users) {
  const id = await ensureAuthUser(user);
  await ensureUserProfile(supabase, {
    id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    grade: user.grade
  });
  console.log(`Profile ready: ${user.email} (${user.role})`);
}

console.log("\nDone. Dev login:");
users.forEach((u) => console.log(`  ${u.email} / ${u.password}`));
