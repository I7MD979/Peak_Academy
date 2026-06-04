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

export const createDailyRoom = async (title, { maxParticipants = 10, expiryHours = 168 } = {}) => {
  if (!process.env.DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const slug = (title || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);

  const response = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name: `session-${slug}-${Date.now()}`,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + expiryHours * 3600,
        max_participants: maxParticipants + 1,
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: true,
        enable_recording: "cloud",
        start_video_off: false,
        start_audio_off: false
      }
    })
  });

  const room = await response.json();
  if (!response.ok) throw new Error(room?.error || "Failed to create Daily room");

  return {
    url: room.url || getRoomUrl(room.name),
    name: room.name
  };
};

export const createMeetingToken = async (roomName, userId, { isOwner = false, userName = "" } = {}) => {
  if (!process.env.DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const response = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: String(userId),
        user_name: userName || String(userId),
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 7200,
        start_video_off: false,
        start_audio_off: false
      }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to create Daily meeting token");
  return data.token;
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
