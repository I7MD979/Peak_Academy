"use client";

import StatsCard from "@/components/admin/StatsCard";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";

export default function ParentDashboardStats({ stats, loading = false }) {
  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        variant="dark"
        title="جلسات هذا الشهر"
        value={(stats?.sessions_this_month ?? 0).toLocaleString("ar-EG")}
        iconName="calendarDays"
        tone="blue"
        hint="تسجيلات آخر 30 يوماً"
      />
      <StatsCard
        variant="dark"
        title="متوسط التقدم"
        value={`${(stats?.average_progress ?? 0).toLocaleString("ar-EG")}%`}
        iconName="trending"
        tone="accent"
        hint="عبر المواد الدراسية"
      />
      <StatsCard
        variant="dark"
        title="ساعات المذاكرة"
        value={(stats?.study_hours ?? 0).toLocaleString("ar-EG")}
        iconName="book"
        tone="success"
        hint="من الجلسات المكتملة"
      />
      <StatsCard
        variant="dark"
        title="الأسئلة"
        value={`${(stats?.questions_answered ?? 0).toLocaleString("ar-EG")}/${(stats?.questions_total ?? 0).toLocaleString("ar-EG")}`}
        iconName="help"
        tone="warning"
        hint="تم الرد / الإجمالي"
      />
    </section>
  );
}
