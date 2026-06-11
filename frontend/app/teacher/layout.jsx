"use client";

import { useState } from "react";
import TeacherSidebar from "@/components/shared/TeacherSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import AppLayoutFrame from "@/components/layout/AppLayoutFrame";
import RoleGate from "@/components/layout/RoleGate";

export default function TeacherLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["teacher"]}>
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
  );
}
