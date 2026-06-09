import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { supabase } from "../lib/supabase.js";
import { getMemberRole } from "./studyRoomChat.service.js";

function getRoomSvc() {
  const httpUrl = process.env.LIVEKIT_URL
    ?.replace("wss://", "https://")
    .replace("ws://", "http://");
  return new RoomServiceClient(httpUrl, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

/**
 * Start a live voice session for a study room.
 * Only the room owner can start a session.
 */
export async function startVoiceSession(roomId, userId) {
  const role = await getMemberRole(roomId, userId);
  if (role !== "owner") {
    throw Object.assign(new Error("فقط صاحب الغرفة يقدر يبدأ جلسة صوتية"), { status: 403 });
  }

  // Reject if there's already an active session
  const { data: existing } = await supabase
    .from("study_room_voice_sessions")
    .select("id")
    .eq("room_id", roomId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    throw Object.assign(new Error("يوجد جلسة صوتية نشطة بالفعل"), { status: 409 });
  }

  const livekitRoomId = `study-${roomId}-${Date.now()}`;
  await getRoomSvc().createRoom({
    name:             livekitRoomId,
    emptyTimeout:     300,
    maxParticipants:  50
  });

  const { data, error } = await supabase
    .from("study_room_voice_sessions")
    .insert({ room_id: roomId, started_by: userId, livekit_room_id: livekitRoomId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get a LiveKit token to join an active voice session.
 * owner/ta  → canPublish: true  (speakers)
 * student   → canPublish: false (listeners)
 */
export async function joinVoiceSession(sessionId, userId, userName) {
  const { data: session, error: sessErr } = await supabase
    .from("study_room_voice_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  if (sessErr || !session) {
    throw Object.assign(new Error("الجلسة الصوتية غير موجودة أو منتهية"), { status: 404 });
  }

  const role = await getMemberRole(session.room_id, userId);
  if (!role) {
    throw Object.assign(new Error("لست عضواً في هذه الغرفة"), { status: 403 });
  }

  const canPublish = role === "owner" || role === "ta";

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: userId, name: userName }
  );
  at.addGrant({
    roomJoin:       true,
    room:           session.livekit_room_id,
    canPublish,
    canSubscribe:   true,
    canPublishData: true
  });

  return {
    token:           await at.toJwt(),
    livekit_url:     process.env.LIVEKIT_URL,
    livekit_room_id: session.livekit_room_id,
    can_publish:     canPublish,
    session_id:      session.id
  };
}

/**
 * End a voice session and disconnect all participants.
 * owner or moderator only.
 */
export async function endVoiceSession(sessionId, userId) {
  const { data: session } = await supabase
    .from("study_room_voice_sessions")
    .select("room_id, livekit_room_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) throw Object.assign(new Error("الجلسة غير موجودة"), { status: 404 });

  const role = await getMemberRole(session.room_id, userId);
  if (role !== "owner" && role !== "moderator") {
    throw Object.assign(new Error("فقط صاحب الغرفة يقدر يوقف الجلسة"), { status: 403 });
  }

  if (session.livekit_room_id) {
    await getRoomSvc().deleteRoom(session.livekit_room_id).catch(() => {});
  }

  await supabase
    .from("study_room_voice_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
}

/**
 * Student raises hand to speak in a voice session.
 */
export async function raiseHand(sessionId, userId) {
  const { error } = await supabase
    .from("raise_hand_queue")
    .upsert(
      { session_id: sessionId, user_id: userId, status: "waiting", requested_at: new Date().toISOString() },
      { onConflict: "session_id,user_id" }
    );

  if (error) throw error;
}

/**
 * Grant a student permission to speak.
 * owner or ta only. Auto-revokes after 60 seconds.
 */
export async function grantSpeak(sessionId, targetUserId, grantedByUserId) {
  const { data: session } = await supabase
    .from("study_room_voice_sessions")
    .select("room_id, livekit_room_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) throw Object.assign(new Error("الجلسة غير موجودة"), { status: 404 });

  const role = await getMemberRole(session.room_id, grantedByUserId);
  if (role !== "owner" && role !== "ta") {
    throw Object.assign(new Error("ليس لديك صلاحية لمنح إذن الكلام"), { status: 403 });
  }

  const svc = getRoomSvc();

  // Allow participant to publish audio
  await svc.updateParticipant(session.livekit_room_id, targetUserId, undefined, {
    canPublish: true
  });

  await supabase
    .from("raise_hand_queue")
    .update({ status: "granted" })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId);

  // Set expires_at — auto-revoke is handled by scheduler (crash-safe)
  await supabase
    .from("raise_hand_queue")
    .update({
      status:     "granted",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId);
}
