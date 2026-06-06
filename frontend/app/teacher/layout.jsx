"use client";

import { useState } from "react";
import TeacherSidebar from "@/components/shared/TeacherSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import RoleGate from "@/components/layout/RoleGate";

export default function TeacherLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["teacher"]}>
      <div className="min-h-screen bg-background font-cairo text-on-background [color-scheme:dark]" dir="rtl">
        <TeacherSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex min-h-screen flex-col md:ps-[260px]">
          <AppTopbar role="teacher" variant="surface" onOpenMobile={() => setMobileOpen(true)} menuBreakpoint="md" />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RoleGate>
  );
}
