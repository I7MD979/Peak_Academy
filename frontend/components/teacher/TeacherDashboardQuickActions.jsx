"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { TEACHER_DASHBOARD_QUICK_ACTIONS } from "@/lib/teacher-dashboard";
import { cn } from "@/lib/utils";

export default function TeacherDashboardQuickActions() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {TEACHER_DASHBOARD_QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 transition-all hover:-translate-y-0.5",
            action.tone
          )}
        >
          <Icon name={action.icon} size={22} />
          <span className="font-bold">{action.label}</span>
        </Link>
      ))}
    </section>
  );
}
