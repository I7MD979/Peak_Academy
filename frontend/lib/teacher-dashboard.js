/** ثوابت ومساعدات لوحة المعلم */

export const TEACHER_DASHBOARD_QUICK_ACTIONS = [
  {
    href: "/teacher/sessions/new",
    label: "جلسة جديدة",
    icon: "plus",
    tone: "border-peak-orange/30 bg-peak-orange/10 text-peak-orange"
  },
  {
    href: "/teacher/sessions",
    label: "جلساتي",
    icon: "calendarDays",
    tone: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
  },
  {
    href: "/teacher/analytics",
    label: "تحليلاتي",
    icon: "barChart",
    tone: "border-success/30 bg-success/10 text-success"
  },
  {
    href: "/teacher/earnings",
    label: "أرباحي",
    icon: "wallet",
    tone: "border-warning/30 bg-warning/10 text-warning"
  },
  {
    href: "/teacher/profile",
    label: "ملفي الشخصي",
    icon: "user",
    tone: "border-auth-outline-variant/40 bg-auth-surface-low text-auth-on-surface-variant"
  }
];

export function resolveTeacherFirstName(profile) {
  return profile?.full_name?.split(/\s+/)?.[0] || "بك";
}
