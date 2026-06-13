import { PERMISSIONS } from "@/lib/admin-permissions";

/** عناصر تنقل لوحة الإدارة — نصوص عربية موحّدة */
export const ADMIN_NAV_MAIN = [
  { href: "/admin/dashboard",     label: "لوحة التحكم",       icon: "dashboard",   permission: PERMISSIONS.DASHBOARD },
  { href: "/admin/users",         label: "المستخدمون",         icon: "users",       permission: PERMISSIONS.USERS_READ },
  { href: "/admin/verification",  label: "التحقق من الهوية",   icon: "shield",      permission: PERMISSIONS.VERIFICATION_REVIEW },
  { href: "/admin/sessions",      label: "الجلسات",            icon: "video",       permission: PERMISSIONS.SESSIONS_READ },
  { href: "/admin/withdrawals",   label: "طلبات السحب",        icon: "creditCard",  permission: PERMISSIONS.WITHDRAWALS_READ },
  { href: "/admin/reports",       label: "التقارير",           icon: "barChart",    permission: PERMISSIONS.REPORTS },
  { href: "/admin/subscriptions", label: "خطط الاشتراك",      icon: "wallet",      permission: PERMISSIONS.PLANS_READ },
  { href: "/admin/promotions",    label: "العروض والخصومات",  icon: "tag",         permission: PERMISSIONS.PROMOTIONS_READ },
  { href: "/admin/landing",       label: "صفحة الهبوط",        icon: "globe",       permission: PERMISSIONS.LANDING },
  { href: "/admin/permissions",   label: "الصلاحيات",          icon: "shield",      permission: null, adminOnly: true }
];

export const ADMIN_NAV_ACCOUNT = [
  { href: "/admin/profile", label: "حسابي", icon: "user" }
];

export function isAdminNavActive(pathname, href) {
  const path = pathname || "";
  return path === href || path.startsWith(`${href}/`);
}
