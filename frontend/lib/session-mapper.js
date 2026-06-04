import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";

export function mapSessionForCard(session, options = {}) {
  if (!session) return null;

  const teacherUser = session?.teacher?.user || session?.teacher;
  const enrollmentCount =
    session?.enrollments?.[0]?.count ??
    session?.session_enrollments?.[0]?.count ??
    session?.enrollment_count ??
    0;
  const maxStudents = session?.max_students ?? 0;

  return {
    id: session.id,
    title: session.title,
    teacher_name: session.teacher_name || teacherUser?.full_name || "مدرس Peak Academy",
    subject_name: session.subject_name || session.subject?.name_ar || session.subject || "مادة",
    subject_icon: session.subject_icon || session.subject?.icon || null,
    price_per_student: session.price_per_student,
    status: session.status,
    is_live: session.status === "live",
    is_enrolled: options.isEnrolled ?? session.is_enrolled ?? false,
    scheduled_at: session.scheduled_at,
    scheduled_label: session.scheduled_at
      ? formatDateTimeAr(session.scheduled_at)
      : session.scheduled_label || "—",
    price_label: formatCurrencyEgp(session.price_per_student),
    spots_label:
      maxStudents > 0
        ? `${enrollmentCount.toLocaleString("ar-EG")}/${maxStudents.toLocaleString("ar-EG")} طالب`
        : `${enrollmentCount.toLocaleString("ar-EG")} طالب`,
    is_full: maxStudents > 0 && enrollmentCount >= maxStudents,
    free_trial_available: session.free_trial_available,
    low_seats: session.low_seats,
    seats_left: session.seats_left
  };
}
