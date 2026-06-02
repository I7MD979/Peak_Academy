export const createDailyRoom = async (title) => {
  if (!process.env.DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }

  const slug = (title || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);

  const response = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name: `peak-${slug}-${Date.now()}`,
      properties: {
        max_participants: 11,
        enable_recording: "cloud",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24
      }
    })
  });

  const room = await response.json();
  if (!response.ok) throw new Error(room?.error || "Failed to create Daily room");
  return room.url;
};
