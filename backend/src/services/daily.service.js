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

function buildRoomSlug(title) {
  let slug = String(title || "session")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  if (!slug) {
    slug = `r${Date.now().toString(36)}`;
  }
  return slug;
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

/**
 * Create a Daily room. Retries with minimal properties if the API rejects optional flags.
 */
export const createDailyRoom = async (title, { maxParticipants = 10, expiryHours = 168 } = {}) => {
  if (!process.env.DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const name = `session-${buildRoomSlug(title)}-${Date.now().toString(36).slice(-6)}`;
  const exp = Math.floor(Date.now() / 1000) + expiryHours * 3600;
  const max_participants = maxParticipants + 1;

  const fullProperties = {
    exp,
    max_participants,
    enable_screenshare: true,
    enable_chat: true,
    enable_knocking: true,
    start_video_off: false,
    start_audio_off: false
  };

  const recording = recordingProperty();
  if (recording) {
    fullProperties.enable_recording = recording;
  }

  const payloads = [
    { name, privacy: "private", properties: fullProperties },
    {
      name,
      privacy: "private",
      properties: { exp, max_participants, enable_chat: true, enable_knocking: true }
    },
    { name, privacy: "private", properties: { exp, max_participants } }
  ];

  let lastErr = null;
  for (const body of payloads) {
    try {
      const room = await postDailyRoom(body);
      return {
        url: room.url || getRoomUrl(room.name),
        name: room.name
      };
    } catch (err) {
      lastErr = err;
      if (err.dailyError !== "invalid-request-error") {
        throw err;
      }
    }
  }

  throw lastErr || new Error("Failed to create Daily room");
};

/** Returns null instead of throwing — used when the session should still be saved. */
export async function createDailyRoomOptional(title, options) {
  try {
    return await createDailyRoom(title, options);
  } catch (err) {
    console.warn(
      "[daily] create room skipped:",
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
  if (!process.env.DAILY_API_KEY || !roomName) return;
  await fetch(`${DAILY_API}/rooms/${encodeURIComponent(roomName)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` }
  });
};

export function resolveRoomName(session) {
  if (session?.daily_room_name) return session.daily_room_name;
  return roomNameFromUrl(session?.daily_room_url || session?.room_url);
}
