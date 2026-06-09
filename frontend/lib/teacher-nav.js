/** عناصر تنقل لوحة المعلم */
export const TEACHER_NAV_MAIN = [
  { href: "/teacher/dashboard", label: "لوحتي", icon: "dashboard" },
  {
    href: "/teacher/sessions",
    label: "جلساتي",
    icon: "calendarDays",
    sessionsOnly: true
  },
  { href: "/teacher/sessions/new", label: "جلسة جديدة", icon: "plus", exact: true },
  { href: "/teacher/analytics", label: "تحليلاتي", icon: "barChart" },
  { href: "/teacher/study-rooms", label: "غرف المذاكرة", icon: "users" },
  { href: "/teacher/earnings", label: "أرباحي", icon: "wallet" },
  { href: "/teacher/profile", label: "ملفي الشخصي", icon: "user" }
];

export function isTeacherNavActive(pathname, item) {
  const path = pathname || "";

  if (item.exact) {
    return path === item.href;
  }

  if (item.sessionsOnly) {
    return (
      path === "/teacher/sessions" ||
      (path.startsWith("/teacher/sessions/") && !path.startsWith("/teacher/sessions/new"))
    );
  }

  return path === item.href || path.startsWith(`${item.href}/`);
}
