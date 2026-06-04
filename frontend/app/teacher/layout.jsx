"use client";

import { useState } from "react";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";
import AppTopbar from "@/components/shared/AppTopbar";
import RoleGate from "@/components/layout/RoleGate";

export default function TeacherLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RoleGate roles={["teacher"]}>
      <div className="flex h-screen bg-bg font-cairo" dir="rtl">
      <TeacherSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar role="teacher" onOpenMobile={() => setMobileOpen(true)} menuBreakpoint="md" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
    </RoleGate>
  );
}
