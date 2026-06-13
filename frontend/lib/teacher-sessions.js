import { getTeacherTeachingGate } from "@/lib/teacher-verification";

export function normalizeSessionStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

export function isLiveSession(session) {
  return normalizeSessionStatus(session?.status) === "live";
}

export function isScheduledSession(session) {
  return normalizeSessionStatus(session?.status) === "scheduled";
}

export const gradeLabels = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي"
};

export function getEnrollmentCount(session) {
  return (
    session?.enrollment_count ??
    session?.enrollments?.[0]?.count ??
    session?.session_enrollments?.[0]?.count ??
    0
  );
}

export function getSubjectLabel(session) {
  if (session?.subject?.name_ar) {
    return `${session.subject.icon ? `${session.subject.icon} ` : ""}${session.subject.name_ar}`;
  }
  if (typeof session?.subject === "string" && session.subject.trim()) {
    return session.subject;
  }
  return "مادة عامة";
}

/** يحدد إمكانية بدء جلسة مجدولة (قبل الموعد بـ 30 دقيقة وبعده بـ 15 دقيقة كحد أقصى). */
export function getStartAvailability(session, verificationStatus) {
  if (verificationStatus !== undefined) {
    const gate = getTeacherTeachingGate(verificationStatus);
    if (!gate.allowed) {
      return { canStart: false, reason: gate.reason };
    }
  }

  if (!isScheduledSession(session)) {
    return { canStart: false, reason: "" };
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
