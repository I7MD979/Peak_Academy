"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { parentCardSolid, parentMuted, parentSectionTitle } from "@/lib/parent-styles";
import { formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ParentDashboardRecentActivity({ sessions = [] }) {
  if (!sessions.length) return null;

  return (
    <section className={cn(parentCardSolid, "p-5 md:p-6")}>
      <h3 className={parentSectionTitle}>آخر النشاط</h3>
      <ul className="mt-3 divide-y divide-auth-outline-variant/25">
        {sessions.slice(0, 4).map((session) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-bold text-auth-on-surface">{session.subject_label}</p>
              <p className={cn("text-xs", parentMuted)}>{formatDateTimeAr(session.scheduled_at)}</p>
            </div>
            <StatusBadge
              status={
                session.status === "completed"
                  ? "completed"
                  : session.status === "live"
                    ? "live"
                    : "scheduled"
              }
              variant="session"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
