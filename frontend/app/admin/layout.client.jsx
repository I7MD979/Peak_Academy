"use client";

import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/shared/AdminTopBar";
import AppLayoutFrame from "@/components/layout/AppLayoutFrame";
import RoleGate from "@/components/layout/RoleGate";

export default function AdminLayoutClient({ children, initialProfile }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["admin", "supervisor"]} initialProfile={initialProfile}>
      <AppLayoutFrame
        shellClassName="admin-shell"
        sidebar={
          <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        }
        topbar={<AdminTopBar onOpenMobile={() => setMobileOpen(true)} />}
      >
        {children}
      </AppLayoutFrame>
    </RoleGate>
  );
}
