/** عناصر تنقل لوحة ولي الأمر */
export const PARENT_NAV_MAIN = [
  { href: "/parent/dashboard", label: "الرئيسية", icon: "home" },
  { href: "/parent/report", label: "التقارير", icon: "barChart" },
  { href: "/parent/profile", label: "حسابي", icon: "user" }
];

export function isParentNavActive(pathname, item) {
  const path = pathname || "";
  return path === item.href || path.startsWith(`${item.href}/`);
}
