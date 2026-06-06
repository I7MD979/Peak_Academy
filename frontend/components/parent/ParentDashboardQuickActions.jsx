"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { PARENT_DASHBOARD_QUICK_ACTIONS } from "@/lib/parent-dashboard";
import { parentBtnSecondary, parentCardSolid, parentSectionTitle } from "@/lib/parent-styles";
import { cn } from "@/lib/utils";

export default function ParentDashboardQuickActions({ reportHref = "/parent/report", onRefresh, refreshing = false }) {
  const actions = PARENT_DASHBOARD_QUICK_ACTIONS.map((action) =>
    action.href === "/parent/report" ? { ...action, href: reportHref } : action
  );

  return (
    <section className={cn(parentCardSolid, "p-5")}>
      <h3 className={cn(parentSectionTitle, "mb-4")}>إجراءات سريعة</h3>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5",
              action.tone
            )}
          >
            <Icon name={action.icon} size={18} />
            {action.label}
          </Link>
        ))}
        <button type="button" onClick={onRefresh} disabled={refreshing} className={parentBtnSecondary}>
          <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : undefined} />
          {refreshing ? "جاري التحديث…" : "تحديث البيانات"}
        </button>
      </div>
    </section>
  );
}
