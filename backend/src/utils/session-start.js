/** Teacher may start 30 minutes before scheduled_at, up to 15 minutes after. */
export function getSessionStartAvailability(session) {
  if (session?.status !== "scheduled") {
    return { canStart: false, reason: "يمكن بدء الجلسات المجدولة فقط" };
  }

  const scheduledAt = new Date(session.scheduled_at).getTime();
  if (Number.isNaN(scheduledAt)) {
    return { canStart: false, reason: "موعد الجلسة غير صالح" };
  }

  const now = Date.now();
  const earliest = scheduledAt - 30 * 60 * 1000;
  const latest = scheduledAt + 15 * 60 * 1000;

  if (now < earliest) {
    const minutes = Math.ceil((earliest - now) / 60000);
    return { canStart: false, reason: `يمكنك البدء بعد ${minutes} دقيقة` };
  }

  if (now > latest) {
    return { canStart: false, reason: "انتهى وقت بدء الجلسة المحدد" };
  }

  return { canStart: true, reason: "" };
}
