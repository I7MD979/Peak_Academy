"use client";

import SessionsStatsGrid from "@/components/shared/SessionsStatsGrid";

const STAT_ITEMS = [
  { key: "available", title: "متاحة للحجز", iconName: "book", tone: "blue" },
  { key: "mine", title: "محاضراتي", iconName: "calendarDays", tone: "accent" },
  { key: "live", title: "مباشرة الآن", iconName: "live", tone: "warning" },
  { key: "completed", title: "منتهية", iconName: "check", tone: "success" }
];

export default function StudentSessionsStats(props) {
  return <SessionsStatsGrid items={STAT_ITEMS} {...props} />;
}
