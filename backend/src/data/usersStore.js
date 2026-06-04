const { users: mockUsers } = require("./mockDb");
const { supabaseAdmin } = require("../lib/supabase");

function hasSupabaseAdmin() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

async function getUserByEmail(email) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,full_name,phone,role,is_active,is_verified")
      .eq("email", email)
      .maybeSingle();
    if (!error && data) return data;
  }
  return mockUsers.find((u) => u.email === email) || null;
}

async function getUserById(id) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,full_name,phone,role,is_active,is_verified")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return data;
  }
  return mockUsers.find((u) => u.id === id) || null;
}

async function upsertUserProfile(profile) {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(profile, { onConflict: "id" })
      .select("id,email,full_name,phone,role,is_active,is_verified")
      .single();
    if (!error && data) return data;
  }

  const existing = mockUsers.find((u) => u.id === profile.id || u.email === profile.email);
  if (existing) {
    Object.assign(existing, profile);
    return existing;
  }
  mockUsers.push(profile);
  return profile;
}

async function listUsers() {
  if (hasSupabaseAdmin()) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,email,full_name,role,is_active,is_verified")
      .order("created_at", { ascending: false });
    if (!error) return data || [];
  }
  return mockUsers.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    is_active: true,
    is_verified: false
  }));
}

module.exports = { getUserByEmail, getUserById, upsertUserProfile, listUsers };
