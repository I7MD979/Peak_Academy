import { sessionStartTime } from "../lib/schema.js";

/** Join allowed from 15 minutes before start until 120 minutes after start */
export function getSessionJoinWindow(session) {
  const startRaw = sessionStartTime(session);
  if (!startRaw) {
    return { canJoin: false, minutesUntil: null, reason: "موعد الجلسة غير محدد" };
  }

  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) {
    return { canJoin: false, minutesUntil: null, reason: "موعد الجلسة غير صالح" };
  }

  const minutesUntil = (start.getTime() - Date.now()) / 60000;
  const canJoin = minutesUntil <= 15 && minutesUntil > -120;

  let reason = null;
  if (minutesUntil > 15) {
    reason = `تبدأ بعد ${Math.round(minutesUntil)} دقيقة`;
  } else if (minutesUntil <= -120) {
    reason = "انتهت الحصة";
  }

  return { canJoin, minutesUntil, reason };
}
