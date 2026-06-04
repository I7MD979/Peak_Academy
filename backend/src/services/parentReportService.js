import { supabase } from "../lib/supabase.js";
import { SUBJECT_LABELS, GRADE_LABELS } from "./studyRoomsService.js";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function subjectLabel(session) {
  return (
    session?.subject_row?.name_ar ||
    SUBJECT_LABELS[session?.subject] ||
    session?.subject ||
    "عام"
  );
}

function subjectKey(session) {
  return session?.subject_row?.name_ar || session?.subject || "general";
}

function computeSubjectProgress(enrollments) {
  const map = {};

  for (const row of enrollments || []) {
    const session = row.session;
    if (!session) continue;
    const key = subjectKey(session);
    if (!map[key]) {
      map[key] = { key, label: subjectLabel(session), total: 0, completed: 0, upcoming: 0 };
    }
    map[key].total += 1;
    if (session.status === "completed") map[key].completed += 1;
    if (session.status === "scheduled") map[key].upcoming += 1;
  }

  return Object.values(map)
    .map((item) => {
      const progress =
        item.total > 0 ? Math.min(100, Math.round((item.completed / item.total) * 100)) : 0;
      const activityBonus = item.upcoming > 0 ? Math.min(15, item.upcoming * 5) : 0;
      const score = Math.min(100, progress + activityBonus);
      return {
        ...item,
        progress: score,
        needs_attention: score > 0 && score < 50
      };
    })
    .sort((a, b) => a.progress - b.progress);
}

export async function listLinkedStudents(parentId) {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("id, grade, section, streak_days, link_code, user:users(id, full_name, avatar_url)")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user?.id,
    full_name: row.user?.full_name || "طالب",
    avatar_url: row.user?.avatar_url || null,
    grade: row.grade,
    grade_label: GRADE_LABELS[row.grade] || row.grade,
    section: row.section,
    streak_days: row.streak_days || 0
  }));
}

export async function getStudentReportForParent(parentId, studentProfileId) {
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("*, user:users(id, full_name, avatar_url, email)")
    .eq("id", studentProfileId)
    .eq("parent_id", parentId)
    .single();

  if (studentError || !student) return null;

  const monthAgo = new Date(Date.now() - MONTH_MS).toISOString();

  const [{ data: enrollments }, { count: questionsTotal }, { count: questionsAnswered }] =
    await Promise.all([
      supabase
        .from("session_enrollments")
        .select(
          "id, status, created_at, session:sessions(id, status, subject, scheduled_at, duration_min, subject_row:subjects(name_ar))"
        )
        .eq("student_id", student.id),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.user_id),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.user_id)
        .eq("status", "answered")
    ]);

  const rows = enrollments || [];
  const now = Date.now();

  const sessionsThisMonth = rows.filter((r) => r.created_at >= monthAgo).length;
  const completedSessions = rows.filter((r) => r.session?.status === "completed").length;
  const upcomingSessions = rows.filter(
    (r) =>
      r.session?.status === "scheduled" && new Date(r.session.scheduled_at).getTime() >= now
  ).length;
  const liveSessions = rows.filter((r) => r.session?.status === "live").length;

  const studyMinutes = rows
    .filter((r) => r.session?.status === "completed")
    .reduce((sum, r) => sum + (r.session?.duration_min || 45), 0);

  const subjects = computeSubjectProgress(rows);
  const weakSubjects = subjects.filter((s) => s.needs_attention);
  const averageProgress =
    subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length)
      : 0;

  const recentSessions = rows
    .filter((r) => r.session)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((r) => ({
      id: r.session.id,
      subject_label: subjectLabel(r.session),
      status: r.session.status,
      scheduled_at: r.session.scheduled_at,
      enrollment_status: r.status
    }));

  return {
    student: {
      id: student.id,
      user_id: student.user?.id || null,
      full_name: student.user?.full_name || "طالب",
      avatar_url: student.user?.avatar_url || null,
      grade: student.grade,
      grade_label: GRADE_LABELS[student.grade] || student.grade,
      section: student.section,
      streak_days: student.streak_days || 0
    },
    stats: {
      sessions_this_month: sessionsThisMonth,
      average_progress: averageProgress,
      study_hours: Math.round(studyMinutes / 60),
      questions_total: questionsTotal || 0,
      questions_answered: questionsAnswered || 0,
      completed_sessions: completedSessions,
      upcoming_sessions: upcomingSessions,
      live_sessions: liveSessions,
      total_enrollments: rows.length
    },
    subjects,
    weak_subjects: weakSubjects,
    recent_sessions: recentSessions,
    alerts: weakSubjects.map((s) => ({
      type: "weak_subject",
      message: `يحتاج دعمًا في مادة ${s.label} (مستوى النشاط ${s.progress}٪)`
    }))
  };
}

export function buildReportPdfText(report) {
  const lines = [
    "تقرير Peak Academy — أداء الطالب",
    `الطالب: ${report.student.full_name}`,
    `الصف: ${report.student.grade_label || "—"}`,
    `الشعبة: ${report.student.section || "—"}`,
    "",
    "ملخص:",
    `- جلسات هذا الشهر: ${report.stats.sessions_this_month}`,
    `- متوسط التقدم: ${report.stats.average_progress}%`,
    `- ساعات المذاكرة التقديرية: ${report.stats.study_hours}`,
    `- الأسئلة: ${report.stats.questions_answered}/${report.stats.questions_total}`,
    "",
    "المواد:"
  ];

  for (const subject of report.subjects) {
    lines.push(`- ${subject.label}: ${subject.progress}% (${subject.completed}/${subject.total} جلسات مكتملة)`);
  }

  if (report.alerts.length) {
    lines.push("", "تنبيهات:");
    for (const alert of report.alerts) {
      lines.push(`- ${alert.message}`);
    }
  }

  lines.push("", `تاريخ التقرير: ${new Date().toLocaleString("ar-EG")}`);
  return lines.join("\n");
}
