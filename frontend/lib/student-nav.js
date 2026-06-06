/** عناصر تنقل لوحة الطالب */
export const STUDENT_NAV_MAIN = [
  { href: "/student/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/student/sessions", label: "الجلسات", icon: "book" },
  { href: "/student/study-rooms", label: "غرف المذاكرة", icon: "school" },
  { href: "/student/ask", label: "اسأل مدرس", icon: "help" },
  { href: "/student/profile", label: "حسابي", icon: "user" }
];

export function isStudentNavActive(pathname, item) {
  const path = pathname || "";
  return path === item.href || path.startsWith(`${item.href}/`);
}
