'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'
import RoleGate from '@/components/layout/RoleGate'

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <RoleGate roles={["admin"]}>
      <div className="flex h-screen bg-bg font-cairo" dir="rtl">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-6">{children}</main>
      </div>
    </div>
    </RoleGate>
  )
}

