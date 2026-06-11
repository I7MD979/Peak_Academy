import { supabase } from "../lib/supabase.js";

/** Get the role of a user in a room (null if not an active member). */
export async function getMemberRole(roomId, userId) {
  const { data } = await supabase
    .from("study_room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (!data?.role) return null;

  if (data.role === "student") {
    const { data: room } = await supabase
      .from("study_rooms")
      .select("teacher_id")
      .eq("id", roomId)
      .maybeSingle();
    if (room?.teacher_id === userId) return "owner";
  }

  return data.role;
}

/** True if user is an active member of the room. */
export async function isActiveMember(roomId, userId) {
  return (await getMemberRole(roomId, userId)) !== null;
}

/**
 * Fetch recent messages for a channel.
 * Returns oldest-first so the UI can render top-to-bottom.
 * Pass `before` (ISO string) for cursor-based pagination.
 */
export async function getRoomMessages(roomId, channel = "general", limit = 50, before = null) {
  let query = supabase
    .from("study_room_messages")
    .select(`
      *,
      sender:users!sender_id(id, full_name, avatar_url),
      reply_message:reply_to(id, content, sender:users!sender_id(full_name))
    `)
    .eq("room_id", roomId)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).reverse();
}

/**
 * Send a message.
 * Enforces:
 *  - voice_note / official_reply: owner or ta only
 *  - question type: must be in qa channel
 */
export async function sendMessage({
  roomId, senderId, channel, type, content, voiceUrl, imageUrl, replyTo
}) {
  if (type === "voice_note" || type === "official_reply") {
    const role = await getMemberRole(roomId, senderId);
    if (role === "student" || !role) {
      throw Object.assign(
        new Error("ليس لديك صلاحية لهذا النوع من الرسائل"),
        { status: 403 }
      );
    }
  }

  if (type === "question" && channel !== "qa") {
    throw Object.assign(new Error("الأسئلة فقط في قناة Q&A"), { status: 400 });
  }

  const { data, error } = await supabase
    .from("study_room_messages")
    .insert({
      room_id:   roomId,
      sender_id: senderId,
      channel,
      type,
      content:   content   || null,
      voice_url: voiceUrl  || null,
      image_url: imageUrl  || null,
      reply_to:  replyTo   || null
    })
    .select(`*, sender:users!sender_id(id, full_name, avatar_url)`)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark a Q&A question as resolved.
 * Only owner, ta, or moderator can resolve.
 */
export async function resolveQuestion(messageId, userId, roomId) {
  const role = await getMemberRole(roomId, userId);
  if (role === "student" || !role) {
    throw Object.assign(
      new Error("فقط المدرس أو المساعد يقدر يغلق السؤال"),
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("study_room_messages")
    .update({ is_resolved: true })
    .eq("id", messageId)
    .eq("room_id", roomId);

  if (error) throw error;
}

/**
 * Assign ta role to a room member.
 * Only owner or moderator can assign TAs.
 */
export async function assignTA(roomId, targetUserId, assignedByUserId) {
  const assignerRole = await getMemberRole(roomId, assignedByUserId);
  if (assignerRole !== "owner" && assignerRole !== "moderator") {
    throw Object.assign(new Error("فقط صاحب الغرفة يقدر يعين مساعدين"), { status: 403 });
  }

  const { error } = await supabase
    .from("study_room_members")
    .update({ role: "ta" })
    .eq("room_id", roomId)
    .eq("user_id", targetUserId)
    .is("left_at", null);

  if (error) throw error;
}
