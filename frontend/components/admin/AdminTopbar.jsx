'use client'

import AppTopbar from '@/components/shared/AppTopbar'

export default function AdminTopbar({ onOpenMobile }) {
  return <AppTopbar role="admin" onOpenMobile={onOpenMobile} menuBreakpoint="md" />
}
