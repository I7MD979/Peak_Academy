"use client";

import { useState } from "react";
import StudentSidebar from "@/components/shared/StudentSidebar";
import StudentBottomNav from "@/components/student/StudentBottomNav";
import AppTopbar from "@/components/shared/AppTopbar";
import RoleGate from "@/components/layout/RoleGate";

export default function StudentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["student"]}>
      <div className="min-h-screen bg-background font-cairo text-on-background [color-scheme:dark]" dir="rtl">
        <StudentSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex min-h-screen flex-col md:ps-[260px]">
          <AppTopbar role="student" variant="surface" onOpenMobile={() => setMobileOpen(true)} menuBreakpoint="md" />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
          <StudentBottomNav className="md:hidden" />
        </div>
      </div>
    </RoleGate>
  );
}
