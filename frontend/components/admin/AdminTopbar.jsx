"use client";

import AppTopbar from "@/components/shared/AppTopbar";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";

/** شريط علوي للإدارة — يعرض اسم المشرف من الملف الكامل */
export default function AdminTopbar({ onOpenMobile }) {
  const profile = useSidebarProfile();

  return (
    <AppTopbar
      role="admin"
      onOpenMobile={onOpenMobile}
      menuBreakpoint="md"
      displayName={profile.full_name}
      displayAvatar={profile.avatar_url}
      displayRoleLabel={profile.roleLabel}
      displayEmail={profile.email}
    />
  );
}
