"use client";

import SessionsStatsGrid from "@/components/shared/SessionsStatsGrid";

const STAT_ITEMS = [
  { key: "scheduled", title: "قادمة", iconName: "calendarDays", tone: "blue" },
  { key: "live", title: "مباشرة", iconName: "live", tone: "accent" },
  { key: "completed", title: "منتهية", iconName: "check", tone: "success" },
  { key: "cancelled", title: "ملغاة", iconName: "close", tone: "warning" }
];

export default function TeacherSessionsStats(props) {
  return <SessionsStatsGrid items={STAT_ITEMS} {...props} />;
}
