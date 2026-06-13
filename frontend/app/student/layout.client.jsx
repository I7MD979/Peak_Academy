"use client";

import { useState } from "react";
import StudentSidebar from "@/components/shared/StudentSidebar";
import StudentBottomNav from "@/components/student/StudentBottomNav";
import AppTopbar from "@/components/shared/AppTopbar";
import AppLayoutFrame from "@/components/layout/AppLayoutFrame";
import RoleGate from "@/components/layout/RoleGate";
import RoleShellProviders from "@/components/providers/RoleShellProviders";

export default function StudentLayoutClient({ children, initialProfile }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleShellProviders initialProfile={initialProfile}>
      <RoleGate roles={["student"]} initialProfile={initialProfile}>
      <AppLayoutFrame
        mobileNavPadding
        sidebar={
          <StudentSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        }
        topbar={
          <AppTopbar
            role="student"
            variant="surface"
            onOpenMobile={() => setMobileOpen(true)}
            menuBreakpoint="md"
          />
        }
        footer={<StudentBottomNav className="md:hidden" />}
      >
        {children}
      </AppLayoutFrame>
      </RoleGate>
    </RoleShellProviders>
  );
}
