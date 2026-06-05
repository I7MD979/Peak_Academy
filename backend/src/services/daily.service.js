const DAILY_API = "https://api.daily.co/v1";

function dailyDomain() {
  return process.env.DAILY_DOMAIN || "peak-academy";
}

export function getRoomUrl(roomName) {
  if (!roomName) return null;
  if (roomName.startsWith("http")) return roomName;
  return `https://${dailyDomain()}.daily.co/${roomName}`;
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

/** Deterministic Daily room name — one room per session, safe for idempotent start. */
export function sessionDailyRoomName(sessionId) {
  const slug = String(sessionId || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `session-${slug || "unknown"}`;
}

function recordingProperty() {
  const mode = String(process.env.DAILY_ENABLE_RECORDING || "").trim().toLowerCase();
  if (["cloud", "cloud-audio-only", "local", "raw-tracks"].includes(mode)) {
    return mode;
  }
  return null;
}

async function postDailyRoom(body) {
  const response = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  let room = {};
  try {
    room = await response.json();
  } catch {
    room = {};
  }

  if (!response.ok) {
    const err = new Error(
      typeof room?.error === "string" ? room.error : room?.info || "Failed to create Daily room"
    );
    err.dailyError = room?.error;
    err.dailyInfo = room?.info;
    err.status = response.status;
    throw err;
  }

  return room;
}

export function mapDailyError(err) {
  if (!err) {
    return { status: 502, message: "تعذر إنشاء غرفة الفيديو" };
  }

  const code = err.dailyError || err.message || "";
  const info = err.dailyInfo ? String(err.dailyInfo) : "";

  if (/DAILY_API_KEY is not configured/i.test(err.message)) {
    return {
      status: 503,
      message: "غرفة الفيديو غير مفعّلة على الخادم. أضف DAILY_API_KEY في Railway."
    };
  }

  if (code === "authentication-error") {
    return {
      status: 503,
      message: "مفتاح Daily.co غير صالح. راجع DAILY_API_KEY في Railway."
    };
  }

  if (code === "invalid-request-error") {
    return {
      status: 502,
      message:
        info ||
        "إعدادات غرفة Daily غير مدعومة (غالبًا التسجيل السحابي). الجلسة يمكن حفظها بدون بث مباشر حتى يُضبط الحساب."
    };
  }

  return {
    status: 502,
    message: info || err.message || "تعذر إنشاء غرفة الفيديو"
  };
}

export async function getDailyRoom(roomName) {
  if (!process.env.DAILY_API_KEY || !roomName) return null;
  try {
    const response = await fetch(`${DAILY_API}/rooms/${encodeURIComponent(roomName)}`, {
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Idempotent: returns existing Daily room for session or creates session-{id}.
 * Handles 409 race when two start requests run concurrently.
 */
export async function ensureSessionDailyRoom(sessionId, { maxStudents = 10, expiryHours = 3 } = {}) {
  if (!process.env.DAILY_API_KEY) return null;

  const roomName = sessionDailyRoomName(sessionId);
  const existing = await getDailyRoom(roomName);
  if (existing?.name) {
    return {
      name: existing.name,
      url: existing.url || getRoomUrl(existing.name)
    };
  }

  const max_participants = Math.max(2, Number(maxStudents) + 1);
  const exp = Math.floor(Date.now() / 1000) + expiryHours * 3600;

  const fullProperties = {
    exp,
    max_participants,
    enable_screenshare: true,
    enable_chat: true,
    enable_knocking: true,
    start_video_off: false,
    start_audio_off: true
  };

  const recording = recordingProperty();
  if (recording) {
    fullProperties.enable_recording = recording;
  }

  const payloads = [
    { name: roomName, privacy: "private", properties: fullProperties },
    {
      name: roomName,
      privacy: "private",
      properties: { exp, max_participants, enable_chat: true, enable_knocking: true }
    },
    { name: roomName, privacy: "private", properties: { exp, max_participants } }
  ];

  let lastErr = null;
  for (const body of payloads) {
    try {
      const room = await postDailyRoom(body);
      return {
        name: room.name || roomName,
        url: room.url || getRoomUrl(room.name || roomName)
      };
    } catch (err) {
      lastErr = err;
      if (err.status === 409) {
        const raced = await getDailyRoom(roomName);
        if (raced?.name) {
          return {
            name: raced.name,
            url: raced.url || getRoomUrl(raced.name)
          };
        }
      }
      if (err.dailyError !== "invalid-request-error") {
        throw err;
      }
    }
  }

  throw lastErr || new Error("Failed to create Daily room");
}

/** Returns null instead of throwing — used when the session should still proceed without video. */
export async function ensureSessionDailyRoomOptional(sessionId, options) {
  try {
    return await ensureSessionDailyRoom(sessionId, options);
  } catch (err) {
    console.warn(
      "[daily] ensure session room skipped:",
      sessionId,
      err.dailyError || err.message,
      err.dailyInfo || ""
    );
    return null;
  }
}

export async function createMeetingTokenOptional(
  roomName,
  userId,
  { isOwner = false, userName = "" } = {}
) {
  try {
    return await createMeetingToken(roomName, userId, { isOwner, userName });
  } catch (err) {
    console.warn(
      "[daily] meeting token:",
      err.dailyError || err.message,
      err.dailyInfo || ""
    );
    return null;
  }
}

async function postMeetingToken(body) {
  const response = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const err = new Error(
      typeof data?.error === "string" ? data.error : data?.info || "Failed to create Daily meeting token"
    );
    err.dailyError = data?.error;
    err.dailyInfo = data?.info;
    throw err;
  }
  return data.token;
}

export const createMeetingToken = async (roomName, userId, { isOwner = false, userName = "" } = {}) => {
  if (!process.env.DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const exp = Math.floor(Date.now() / 1000) + 7200;
  const payloads = [
    {
      properties: {
        room_name: roomName,
        user_id: String(userId),
        user_name: userName || String(userId),
        is_owner: isOwner,
        exp,
        start_video_off: false,
        start_audio_off: false
      }
    },
    {
      properties: {
        room_name: roomName,
        user_id: String(userId),
        user_name: String(userId).slice(0, 32),
        is_owner: isOwner,
        exp
      }
    }
  ];

  let lastErr = null;
  for (const body of payloads) {
    try {
      return await postMeetingToken(body);
    } catch (err) {
      lastErr = err;
      if (err.dailyError !== "invalid-request-error") throw err;
    }
  }
  throw lastErr || new Error("Failed to create Daily meeting token");
};

export const deleteDailyRoom = async (roomName) => {
  if (!process.env.DAILY_API_KEY || !roomName) return false;
  try {
    const response = await fetch(`${DAILY_API}/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` }
    });
    return response.ok || response.status === 404;
  } catch (err) {
    console.warn("[daily] delete room failed:", roomName, err?.message || err);
    return false;
  }
};

/** List rooms in the Daily domain (paginated). */
export async function listDailyRooms({ limit = 100, startingAfter = null } = {}) {
  if (!process.env.DAILY_API_KEY) {
    return { rooms: [], total_count: 0 };
  }

  const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) });
  if (startingAfter) params.set("starting_after", String(startingAfter));

  const response = await fetch(`${DAILY_API}/rooms?${params}`, {
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` }
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const err = new Error(payload?.info || payload?.error || "Failed to list Daily rooms");
    err.dailyError = payload?.error;
    throw err;
  }

  return {
    rooms: Array.isArray(payload?.data) ? payload.data : [],
    total_count: payload?.total_count ?? 0
  };
}

/**
 * Delete Daily rooms not tied to a live session in DB (orphan cleanup).
 */
export async function cleanupOrphanedDailyRooms(supabase, { prefix = "session-" } = {}) {
  if (!process.env.DAILY_API_KEY) {
    return { deleted: [], failed: [], skipped: true };
  }

  const { data: activeSessions, error: dbError } = await supabase
    .from("sessions")
    .select("daily_room_name")
    .eq("status", "live")
    .not("daily_room_name", "is", null);

  if (dbError) throw dbError;

  const activeRoomNames = new Set(
    (activeSessions || []).map((row) => row.daily_room_name).filter(Boolean)
  );

  const deleted = [];
  const failed = [];
  let startingAfter = null;
  let pages = 0;

  while (pages < 20) {
    const { rooms } = await listDailyRooms({ limit: 100, startingAfter });
    if (!rooms.length) break;

    for (const room of rooms) {
      const name = room?.name;
      if (!name || !name.startsWith(prefix)) continue;
      if (activeRoomNames.has(name)) continue;

      const ok = await deleteDailyRoom(name);
      if (ok) {
        deleted.push(name);
        console.log(`[daily] deleted orphaned room: ${name}`);
      } else {
        failed.push(name);
      }
    }

    if (rooms.length < 100) break;
    startingAfter = rooms[rooms.length - 1]?.name;
    pages += 1;
  }

  return { deleted, failed, skipped: false };
}

/** Delete all Peak session rooms (name prefix session-) including orphans not stored in DB. */
export async function purgeSessionDailyRooms({ prefix = "session-" } = {}) {
  if (!process.env.DAILY_API_KEY) {
    return { deleted: [], failed: [], skipped: true };
  }

  const deleted = [];
  const failed = [];
  let startingAfter = null;
  let pages = 0;

  while (pages < 20) {
    const { rooms } = await listDailyRooms({ limit: 100, startingAfter });
    if (!rooms.length) break;

    for (const room of rooms) {
      const name = room?.name;
      if (!name || !name.startsWith(prefix)) continue;
      const ok = await deleteDailyRoom(name);
      if (ok) deleted.push(name);
      else failed.push(name);
    }

    if (rooms.length < 100) break;
    startingAfter = rooms[rooms.length - 1]?.name;
    pages += 1;
  }

  return { deleted, failed, skipped: false };
}

export function resolveRoomName(session) {
  if (session?.daily_room_name) return session.daily_room_name;
  return roomNameFromUrl(session?.daily_room_url || session?.room_url);
}

export async function dailyRoomExists(roomName) {
  if (!process.env.DAILY_API_KEY || !roomName) return false;
  const room = await getDailyRoom(roomName);
  return Boolean(room?.name);
}

/**
 * Resolve room name/url and issue meeting token. Does not create orphan rooms on join.
 */
export async function ensureDailyMeetingAccess({
  sessionId = null,
  maxStudents = 10,
  roomName: initialName,
  roomUrl: initialUrl,
  userId,
  isOwner = false,
  userName = ""
}) {
  let roomName = initialName || roomNameFromUrl(initialUrl);
  let roomUrl = initialUrl || (roomName ? getRoomUrl(roomName) : null);
  let lastError = null;

  if (!process.env.DAILY_API_KEY) {
    return { roomName, roomUrl, token: null, lastError: new Error("DAILY_API_KEY is not configured") };
  }

  if (!roomName && sessionId) {
    const ensured = await ensureSessionDailyRoomOptional(sessionId, { maxStudents });
    if (ensured) {
      roomName = ensured.name;
      roomUrl = ensured.url;
    }
  }

  if (!roomName) {
    return { roomName: null, roomUrl: null, token: null, lastError: new Error("Daily room not configured") };
  }

  const issueToken = async (name) => {
    try {
      const token = await createMeetingToken(name, userId, { isOwner, userName });
      return { token, error: null };
    } catch (err) {
      lastError = err;
      return { token: null, error: err };
    }
  };

  let { token, error: tokenErr } = await issueToken(roomName);
  if (token) {
    return { roomName, roomUrl, token, lastError: null };
  }

  if (tokenErr?.dailyError === "authentication-error") {
    return { roomName, roomUrl, token: null, lastError: tokenErr };
  }

  const roomMissing = !(await dailyRoomExists(roomName));
  if (roomMissing && sessionId) {
    const fresh = await ensureSessionDailyRoomOptional(sessionId, { maxStudents });
    if (fresh) {
      roomName = fresh.name;
      roomUrl = fresh.url;
      ({ token, error: tokenErr } = await issueToken(roomName));
      if (token) {
        return { roomName, roomUrl, token, lastError: null, recreated: true };
      }
      lastError = tokenErr;
    }
  }

  return { roomName, roomUrl, token: null, lastError };
}
