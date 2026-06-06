"use client";

import AppSidebar from "@/components/shared/AppSidebar";
import { PARENT_NAV_MAIN, isParentNavActive } from "@/lib/parent-nav";

export default function ParentSidebar(props) {
  return (
    <AppSidebar
      logoHref="/parent/dashboard"
      subtitle="لوحة وليّ الأمر"
      navMain={PARENT_NAV_MAIN}
      isNavActive={isParentNavActive}
      profileHref="/parent/profile"
      roleLabel="وليّ أمر"
      cta={{ href: "/parent/dashboard?link=1", label: "ربط طالب", icon: "plus" }}
      {...props}
    />
  );
}
