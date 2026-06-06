"use client";

import LiveSessionsBanner from "@/components/shared/LiveSessionsBanner";

export default function TeacherDashboardLiveBanner({ count = 0 }) {
  return (
    <LiveSessionsBanner
      count={count}
      variant="teacher"
      href="/teacher/sessions?status=live"
      label="إدارة الجلسات المباشرة"
    />
  );
}
