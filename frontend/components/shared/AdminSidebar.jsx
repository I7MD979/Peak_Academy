"use client";

import AppSidebar from "@/components/shared/AppSidebar";
import { ADMIN_NAV_MAIN, ADMIN_NAV_ACCOUNT, isAdminNavActive } from "@/lib/admin-nav";

export default function AdminSidebar(props) {
  return (
    <AppSidebar
      logoHref="/admin/dashboard"
      subtitle="لوحة الإدارة"
      navSections={[
        { title: "القائمة الرئيسية", items: ADMIN_NAV_MAIN },
        { title: "الحساب", items: ADMIN_NAV_ACCOUNT }
      ]}
      isNavActive={(pathname, item) => isAdminNavActive(pathname, item.href)}
      profileHref="/admin/profile"
      roleLabel="مشرف النظام"
      {...props}
    />
  );
}
