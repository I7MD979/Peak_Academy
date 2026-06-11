"use client";

import { useState } from "react";
import ParentSidebar from "@/components/shared/ParentSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import AppLayoutFrame from "@/components/layout/AppLayoutFrame";
import RoleGate from "@/components/layout/RoleGate";

export default function ParentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["parent"]}>
      <AppLayoutFrame
        sidebar={
          <ParentSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        }
        topbar={
          <AppTopbar
            role="parent"
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
