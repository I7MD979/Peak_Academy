import { supabase } from "../lib/supabase.js";
import { publishNotification } from "./notificationHub.js";
import { isMissingTableError } from "../utils/db-errors.js";
import { getCacheEntry, setCacheEntry, invalidate } from "../lib/cache.js";

function warnMissingNotifications(err) {
  if (process.env.NODE_ENV !== "production" && isMissingTableError(err)) {
    console.warn(
      "[notifications] table missing — run backend/supabase/migrations/20260606_notifications_question_pricing.sql in Supabase SQL Editor"
    );
  }
}

export async function createUserNotification({
  userId,
  type,
  title,
  body,
  data = null,
  titleAr,
  bodyAr,
  actionUrl,
  metadata = null
}) {
  const row = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    type: type || "general",
    title: titleAr || title,
    body: bodyAr || body || "",
    title_ar: titleAr || title,
    body_ar: bodyAr || body || "",
    action_url: actionUrl || null,
    metadata: metadata || (data ? { data } : {}),
    is_read: false,
    created_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase.from("notifications").insert(row).select("*").single();
  if (error) throw error;

  try {
    await invalidate(`notif:count:${userId}`);
  } catch {
    /* optional cache */
  }

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

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingNotifications(error);
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function countUnreadNotifications(userId) {
  try {
    const cached = await getCacheEntry(`notif:count:${userId}`);
    if (cached !== null && cached !== undefined && typeof cached === "number") {
      return cached;
    }
    if (cached === "0" || cached === 0) return 0;
    if (cached === "1" || typeof cached === "string" && /^\d+$/.test(cached)) {
      return parseInt(cached, 10);
    }
  } catch {
    /* optional cache */
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingNotifications(error);
      return 0;
    }
    throw error;
  }
  const result = count || 0;
  try {
    await setCacheEntry(`notif:count:${userId}`, 60, result);
  } catch {
    /* optional cache */
  }
  return result;
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
