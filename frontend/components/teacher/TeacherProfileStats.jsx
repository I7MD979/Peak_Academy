"use client";

import StatsCard from "@/components/admin/StatsCard";
import { formatCurrencyEgp } from "@/lib/format";

export default function TeacherProfileStats({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        variant="dark"
        title="جلسات مجدولة"
        value={(stats?.sessions?.scheduled ?? 0).toLocaleString("ar-EG")}
        iconName="calendarDays"
        tone="blue"
      />
      <StatsCard
        variant="dark"
        title="جلسات مباشرة"
        value={(stats?.sessions?.live ?? 0).toLocaleString("ar-EG")}
        iconName="live"
        tone="accent"
      />
      <StatsCard
        variant="dark"
        title="جلسات مكتملة"
        value={(stats?.sessions?.completed ?? 0).toLocaleString("ar-EG")}
        iconName="check"
        tone="success"
      />
      <StatsCard
        variant="dark"
        title="إجمالي الأرباح"
        value={formatCurrencyEgp(stats?.earnings?.total_earnings)}
        iconName="wallet"
        tone="warning"
        hint={`متاح: ${formatCurrencyEgp(stats?.earnings?.available_balance)}`}
      />
    </section>
  );
}
