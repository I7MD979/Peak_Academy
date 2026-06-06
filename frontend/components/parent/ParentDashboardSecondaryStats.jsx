"use client";

import { parentCardSolid, parentMuted } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "upcoming_sessions", label: "جلسات قادمة", tone: "text-auth-on-surface" },
  { key: "completed_sessions", label: "جلسات مكتملة", tone: "text-success" },
  { key: "total_enrollments", label: "إجمالي التسجيلات", tone: "text-auth-on-surface" }
];

export default function ParentDashboardSecondaryStats({ stats }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {ITEMS.map((item) => (
        <div key={item.key} className={cn(parentCardSolid, "p-4 text-center")}>
          <p className={cn("text-xs", parentMuted)}>{item.label}</p>
          <p className={cn("mt-1 text-xl font-black", item.tone)}>
            {(stats?.[item.key] ?? 0).toLocaleString("ar-EG")}
          </p>
        </div>
      ))}
    </section>
  );
}
