import { supabase } from "../lib/supabase.js";
import { publishNotification } from "./notificationHub.js";

export async function createUserNotification({ userId, type, title, body, data = null }) {
  const row = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    type: type || "general",
    title,
    body: body || "",
    is_read: false,
    created_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase.from("notifications").insert(row).select("*").single();
  if (error) throw error;

  publishNotification(userId, { ...inserted, data });
  return inserted;
}

export async function listUserNotifications(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function countUnreadNotifications(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead(id, userId) {
  const patch = { is_read: true, read_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("notifications")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(userId) {
  const patch = { is_read: true, read_at: new Date().toISOString() };
  const { error } = await supabase
    .from("notifications")
    .update(patch)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return true;
}
