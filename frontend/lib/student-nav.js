/** عناصر تنقل لوحة الطالب */
export const STUDENT_NAV_MAIN = [
  { href: "/student/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/student/sessions", label: "المحاضرات", icon: "book" },
  { href: "/student/study-rooms", label: "سؤال وجواب", icon: "school" },
  { href: "/student/profile", label: "حسابي", icon: "user" }
];

export function isStudentNavActive(pathname, item) {
  const path = pathname || "";
  return path === item.href || path.startsWith(`${item.href}/`);
}
