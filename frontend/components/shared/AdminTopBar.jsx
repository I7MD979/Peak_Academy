"use client";

import AppTopbar from "@/components/shared/AppTopbar";

/** شريط علوي موحّد للإدارة — MD3 داكن + breadcrumbs + قائمة مستخدم */
export default function AdminTopBar(props) {
  return <AppTopbar role="admin" variant="surface" {...props} />;
}
