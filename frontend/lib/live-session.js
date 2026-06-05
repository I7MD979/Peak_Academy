export function formatSessionDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getCountdownToStart(scheduledAt) {
  const target = new Date(scheduledAt).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  if (diffMs <= 0) return null;
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes > 10) return null;
  return minutes;
}

export function mapSessionForLive(session) {
  if (!session) return null;
  return {
    id: session.id,
    subject: session.subject?.name_ar || session.subject || "مادة عامة",
    topic: session.title || session.description || "—",
    scheduledAt: session.scheduled_at || session.start_time,
    durationMinutes: session.duration_min || session.duration_minutes || 60,
    enrolledCount:
      session.enrollment_count ??
      session.enrollments?.[0]?.count ??
      session.session_enrollments?.[0]?.count ??
      0,
    maxStudents: session.max_students || 5,
    status: String(session.status || "").toLowerCase(),
    grade: session.grade
  };
}
