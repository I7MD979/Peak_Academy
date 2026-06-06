"use client";

import { useState } from "react";
import ParentSidebar from "@/components/shared/ParentSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import RoleGate from "@/components/layout/RoleGate";

export default function ParentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["parent"]}>
      <div className="min-h-screen bg-background font-cairo text-on-background [color-scheme:dark]" dir="rtl">
        <ParentSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex min-h-screen flex-col md:ps-[260px]">
          <AppTopbar role="parent" variant="surface" onOpenMobile={() => setMobileOpen(true)} menuBreakpoint="md" />
          <main className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto pb-10">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
