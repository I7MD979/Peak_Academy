"use client";



import { useState } from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";

import AdminTopBar from "@/components/shared/AdminTopBar";

import RoleGate from "@/components/layout/RoleGate";



export default function AdminLayout({ children }) {

  const [mobileOpen, setMobileOpen] = useState(false);



  return (

    <RoleGate roles={["admin", "supervisor"]}>

      <div className="admin-shell min-h-screen bg-background font-cairo text-on-background [color-scheme:dark]" dir="rtl">

        <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div className="flex min-h-screen flex-col md:ps-[260px]">

          <AdminTopBar onOpenMobile={() => setMobileOpen(true)} />

          <main className="flex-1 overflow-y-auto">{children}</main>

        </div>

      </div>

    </RoleGate>

  );

}

