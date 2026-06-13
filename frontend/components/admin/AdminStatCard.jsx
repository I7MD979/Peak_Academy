"use client";

import Link from "next/link";
import StatsCard from "@/components/admin/StatsCard";
import { cn } from "@/lib/utils";
import { statusDangerSolid } from "@/lib/semantic-styles";

const TONE_MAP = {
  default: "accent",
  warning: "warning",
  blue: "blue",
  success: "success",
  danger: "warning",
  orange: "accent",
  purple: "blue"
};

/** Material icon name → Lucide iconMap key */
export const ADMIN_STAT_ICONS = {
  groups: "users",
  group: "users",
  schedule: "calendarDays",
  live_tv: "liveTv",
  payments: "wallet",
  person: "user",
  video_library: "video",
  school: "school",
  account_balance_wallet: "wallet",
  pending_actions: "calendarDays",
  trending_up: "trending",
  tag: "tag",
  public: "globe",
  shield: "shield",
  bar_chart: "barChart",
  credit_card: "creditCard",
  confirmation_number: "tag",
  redeem: "gift",
  co_present: "user",
  family_restroom: "users",
  block: "lock",
  subscriptions: "creditCard",
  stars: "star",
  content_copy: "copy",
  workspace_premium: "shield"
};

export function resolveAdminStatIcon(name) {
  return ADMIN_STAT_ICONS[name] || name || "dashboard";
}

/**
 * Unified admin stat card — Lucide via StatsCard (replaces inline Material StatCard).
 */
export default function AdminStatCard({
  icon,
  iconName,
  label,
  value,
  sub,
  tone = "default",
  live = false,
  active = false,
  href,
  onClick,
  loading = false,
  hint
}) {
  const resolvedIcon = iconName || resolveAdminStatIcon(icon);
  const cardTone = TONE_MAP[tone] || "blue";
  const displayValue =
    loading ? "…" : typeof value === "number" ? value.toLocaleString("ar-EG") : value;

  const wrapperClass = cn(
    "block rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peak-orange/40",
    active && "ring-2 ring-peak-orange/50 border-peak-orange/40",
    (href || onClick) && "hover:border-md-primary/40 cursor-pointer"
  );

  const headerExtra = live ? (
    <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold", statusDangerSolid)}>
      <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
      مباشر الآن
    </span>
  ) : sub ? (
    <span className="text-xs font-bold text-md-primary">{sub}</span>
  ) : null;

  const inner = (
    <div className="relative">
      {headerExtra ? <div className="absolute end-0 top-0 z-10">{headerExtra}</div> : null}
      <StatsCard
        title={label}
        value={displayValue}
        iconName={resolvedIcon}
        tone={cardTone}
        hint={hint}
        variant="dark"
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(wrapperClass, "w-full text-start")}>
        {inner}
      </button>
    );
  }

  return <div className={wrapperClass}>{inner}</div>;
}
