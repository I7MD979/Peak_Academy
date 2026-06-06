"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { parentCardSolid, parentMuted, parentSectionTitle } from "@/lib/parent-styles";
import { formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

function resolveSessionStatus(status) {
  if (status === "completed") return "completed";
  if (status === "live") return "live";
  if (status === "cancelled") return "cancelled";
  return "scheduled";
}

export default function ParentReportRecentSessions({ sessions = [] }) {
  if (!sessions.length) return null;

  return (
    <section className={cn(parentCardSolid, "p-5 md:p-6")}>
      <h2 className={parentSectionTitle}>آخر الجلسات</h2>
      <ul className="mt-3 divide-y divide-auth-outline-variant/25">
        {sessions.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-bold text-auth-on-surface">{session.subject_label}</p>
              <p className={cn("text-xs", parentMuted)}>{formatDateTimeAr(session.scheduled_at)}</p>
            </div>
            <StatusBadge variant="session" status={resolveSessionStatus(session.status)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
