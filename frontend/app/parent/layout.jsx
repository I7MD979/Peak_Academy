"use client";

import ParentTopNav from "@/components/parent/ParentTopNav";
import RoleGate from "@/components/layout/RoleGate";

export default function ParentLayout({ children }) {
  return (
    <RoleGate roles={["parent"]}>
      <div className="min-h-screen bg-bg font-cairo" dir="rtl">
        <ParentTopNav />
        <main className="mx-auto max-w-5xl p-4 pb-10 md:p-6">{children}</main>
      </div>
    </RoleGate>
  );
}
