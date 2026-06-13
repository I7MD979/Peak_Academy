"use client";

import { useState } from "react";
import TeacherSidebar from "@/components/shared/TeacherSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import AppLayoutFrame from "@/components/layout/AppLayoutFrame";
import RoleGate from "@/components/layout/RoleGate";

import RoleShellProviders from "@/components/providers/RoleShellProviders";

export default function TeacherLayoutClient({ children, initialProfile }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleShellProviders initialProfile={initialProfile}>
      <RoleGate roles={["teacher"]} initialProfile={initialProfile}>
      <AppLayoutFrame
        sidebar={
          <TeacherSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        }
        topbar={
          <AppTopbar
            role="teacher"
            variant="surface"
            onOpenMobile={() => setMobileOpen(true)}
            menuBreakpoint="md"
          />
        }
      >
        {children}
      </AppLayoutFrame>
      </RoleGate>
    </RoleShellProviders>
  );
}
