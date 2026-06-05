import { AccessToken, RoomServiceClient, TrackType } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export function isLiveKitConfigured() {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export function getLiveKitServerUrl() {
  return LIVEKIT_URL || null;
}

function getRoomServiceClient() {
  const httpUrl = LIVEKIT_URL?.replace("wss://", "https://").replace("ws://", "http://");
  return new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

function roomNameFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const path = new URL(url).pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return null;
  }
}

/** Room name ثابت لكل session (نحفظه في daily_room_name للتوافق مع الـ DB). */
export function sessionLiveKitRoomName(sessionId) {
  const slug = String(sessionId || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `session-${slug || "unknown"}`;
}

/** @deprecated alias — sessions table column still named daily_room_name */
export const sessionDailyRoomName = sessionLiveKitRoomName;

export function resolveRoomName(session) {
  if (session?.daily_room_name) return session.daily_room_name;
  return roomNameFromUrl(session?.daily_room_url || session?.room_url);
}

/** LiveKit uses one shared wss URL — not per-room https links. */
export function getRoomUrl(_roomName) {
  return getLiveKitServerUrl();
}

export async function createLiveKitToken(roomName, userId, { isTeacher = false, userName = "" } = {}) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not configured");
  }

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: String(userId),
    name: userName || String(userId),
    ttl: "2h"
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isTeacher
  });

  return token.toJwt();
}

export async function createLiveKitTokenOptional(roomName, userId, options) {
  try {
    return await createLiveKitToken(roomName, userId, options);
  } catch (err) {
    console.warn("[livekit] token creation failed:", err?.message || err);
    return null;
  }
}

export async function ensureSessionLiveKitRoom(sessionId, { maxStudents = 10, expiryHours = 3 } = {}) {
  if (!isLiveKitConfigured()) return null;

  const roomName = sessionLiveKitRoomName(sessionId);

  try {
    const svc = getRoomServiceClient();
    await svc.createRoom({
      name: roomName,
      maxParticipants: Math.max(2, Number(maxStudents) + 1),
      emptyTimeout: expiryHours * 3600
    });
    return { name: roomName, url: getLiveKitServerUrl() };
  } catch (err) {
    const msg = String(err?.message || "");
    if (/already exists/i.test(msg)) {
      return { name: roomName, url: getLiveKitServerUrl() };
    }
    console.warn("[livekit] ensure room failed:", msg);
    return null;
  }
}

export async function ensureSessionLiveKitRoomOptional(sessionId, options) {
  return ensureSessionLiveKitRoom(sessionId, options);
}

export async function deleteLiveKitRoom(roomName) {
  if (!isLiveKitConfigured() || !roomName) return false;
  try {
    const svc = getRoomServiceClient();
    await svc.deleteRoom(roomName);
    return true;
  } catch (err) {
    console.warn("[livekit] delete room failed:", roomName, err?.message || err);
    return false;
  }
}

export async function muteAllParticipantsInRoom(roomName) {
  if (!isLiveKitConfigured() || !roomName) return { muted: 0 };
  const svc = getRoomServiceClient();
  const participants = await svc.listParticipants(roomName);
  let muted = 0;

  for (const participant of participants) {
    for (const track of participant.tracks || []) {
      if (track.type === TrackType.AUDIO) {
        if (!track.muted) {
          await svc.mutePublishedTrack(roomName, participant.identity, track.sid);
          muted += 1;
        }
      }
    }
  }

  return { muted };
}

export async function ensureLiveKitAccess({
  sessionId,
  maxStudents = 10,
  userId,
  isTeacher = false,
  userName = ""
}) {
  if (!isLiveKitConfigured()) {
    return {
      roomName: null,
      roomUrl: null,
      token: null,
      lastError: new Error("LIVEKIT not configured")
    };
  }

  const roomName = sessionLiveKitRoomName(sessionId);
  await ensureSessionLiveKitRoom(sessionId, { maxStudents });

  const token = await createLiveKitTokenOptional(roomName, userId, { isTeacher, userName });

  return {
    roomName,
    roomUrl: getLiveKitServerUrl(),
    token,
    lastError: token ? null : new Error("Failed to create LiveKit token")
  };
}

export async function cleanupOrphanedLiveKitRooms(supabase, { prefix = "session-" } = {}) {
  if (!isLiveKitConfigured()) {
    return { deleted: [], failed: [], skipped: true };
  }

  const svc = getRoomServiceClient();
  const rooms = await svc.listRooms();

  const { data: activeSessions, error: dbError } = await supabase
    .from("sessions")
    .select("daily_room_name")
    .eq("status", "live")
    .not("daily_room_name", "is", null);

  if (dbError) throw dbError;

  const activeNames = new Set((activeSessions || []).map((s) => s.daily_room_name).filter(Boolean));
  const deleted = [];
  const failed = [];

  for (const room of rooms) {
    if (!room.name?.startsWith(prefix)) continue;
    if (activeNames.has(room.name)) continue;
    if (Number(room.numParticipants) > 0) continue;

    const ok = await deleteLiveKitRoom(room.name);
    if (ok) {
      deleted.push(room.name);
      console.log(`[livekit] deleted orphaned room: ${room.name}`);
    } else {
      failed.push(room.name);
    }
  }

  return { deleted, failed, skipped: false };
}

/** Delete all session-* rooms (aggressive purge). */
export async function purgeSessionLiveKitRooms({ prefix = "session-" } = {}) {
  if (!isLiveKitConfigured()) {
    return { deleted: [], failed: [], skipped: true };
  }

  const svc = getRoomServiceClient();
  const rooms = await svc.listRooms();
  const deleted = [];
  const failed = [];

  for (const room of rooms) {
    if (!room.name?.startsWith(prefix)) continue;
    const ok = await deleteLiveKitRoom(room.name);
    if (ok) deleted.push(room.name);
    else failed.push(room.name);
  }

  return { deleted, failed, skipped: false };
}

export function mapLiveKitError(err) {
  if (!err) return { status: 502, message: "تعذر إنشاء غرفة الفيديو" };

  const msg = String(err.message || "");

  if (/not configured/i.test(msg)) {
    return {
      status: 503,
      message: "LiveKit غير مفعّل على الخادم. أضف LIVEKIT_URL و LIVEKIT_API_KEY في Railway."
    };
  }

  return { status: 502, message: msg || "تعذر إنشاء غرفة الفيديو" };
}
