"use client";

import StatsCard from "@/components/admin/StatsCard";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { formatCurrencyEgp } from "@/lib/format";

export default function TeacherDashboardStats({ stats, loading = false }) {
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
        title="جلسات مجدولة"
        value={(stats?.scheduled_sessions ?? 0).toLocaleString("ar-EG")}
        iconName="calendarDays"
        tone="blue"
      />
      <StatsCard
        variant="dark"
        title="جلسات مباشرة"
        value={(stats?.live_sessions ?? 0).toLocaleString("ar-EG")}
        iconName="live"
        tone="accent"
      />
      <StatsCard
        variant="dark"
        title="جلسات مكتملة"
        value={(stats?.completed_sessions ?? 0).toLocaleString("ar-EG")}
        iconName="check"
        tone="success"
      />
      <StatsCard
        variant="dark"
        title="إجمالي الأرباح"
        value={formatCurrencyEgp(stats?.total_earnings)}
        iconName="wallet"
        tone="warning"
        hint={`متاح للسحب: ${formatCurrencyEgp(stats?.available_balance)}`}
      />
    </section>
  );
}
