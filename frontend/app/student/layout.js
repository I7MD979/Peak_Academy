"use client";

import { useState } from "react";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentBottomNav from "@/components/student/StudentBottomNav";
import AppTopbar from "@/components/shared/AppTopbar";
import RoleGate from "@/components/layout/RoleGate";

export default function StudentLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["student"]}>
      <div className="flex h-screen bg-bg font-cairo" dir="rtl">
      <StudentSidebar
        className="hidden lg:flex"
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar
          role="student"
          onOpenMobile={() => setMobileOpen(true)}
          menuBreakpoint="lg"
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
        <StudentBottomNav className="lg:hidden" />
      </div>
    </div>
    </RoleGate>
  );
}
