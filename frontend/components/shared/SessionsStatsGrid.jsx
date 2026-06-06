"use client";

import StatsCard from "@/components/admin/StatsCard";
import { StatCardSkeleton } from "@/components/shared/LoadingSkeleton";

export default function SessionsStatsGrid({ items = [], tabCounts = {}, loading = false }) {
  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: Math.max(items.length, 4) }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatsCard
          key={item.key}
          variant="dark"
          title={item.title}
          value={(tabCounts[item.key] ?? 0).toLocaleString("ar-EG")}
          iconName={item.iconName}
          tone={item.tone}
          hint={item.hint}
        />
      ))}
    </section>
  );
}
