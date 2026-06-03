/** عناصر تنقل لوحة الإدارة — نصوص عربية موحّدة */
export const ADMIN_NAV_MAIN = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "dashboard" },
  { href: "/admin/users", label: "المستخدمون", icon: "users" },
  { href: "/admin/sessions", label: "الجلسات", icon: "video" },
  { href: "/admin/withdrawals", label: "طلبات السحب", icon: "creditCard" },
  { href: "/admin/reports", label: "التقارير", icon: "barChart" }
];

export const ADMIN_NAV_ACCOUNT = [
  { href: "/admin/profile", label: "حسابي", icon: "user" }
];

export function isAdminNavActive(pathname, href) {
  const path = pathname || "";
  return path === href || path.startsWith(`${href}/`);
}
