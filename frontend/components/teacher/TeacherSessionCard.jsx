"use client";

import Link from "next/link";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  getEnrollmentCount,
  getStartAvailability,
  getSubjectLabel,
  gradeLabels,
  isLiveSession,
  isScheduledSession
} from "@/lib/teacher-sessions";
import { teacherBtnPrimary, teacherBtnSecondary } from "@/lib/teacher-styles";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TeacherSessionCard({
  session,
  actionId = "",
  onDetails,
  onStart,
  onEnd,
  onCancel,
  onJoin
}) {
  const enrolled = getEnrollmentCount(session);
  const max = session.max_students || 0;
  const full = max > 0 && enrolled >= max;
  const startInfo = getStartAvailability(session);
  const isLive = isLiveSession(session);
  const isScheduled = isScheduledSession(session);
  const busyStart = actionId === `start-${session.id}`;
  const busyEnd = actionId === `end-${session.id}`;
  const busyCancel = actionId === `cancel-${session.id}`;

  return (
    <article
      className={cn(
        "rounded-2xl border border-auth-outline-variant/40 bg-auth-surface-low p-4 transition-all hover:border-peak-orange/30",
        isLive && "border-success/35 bg-success/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-auth-on-surface">{session.title}</h3>
          <p className="mt-1 text-sm text-auth-on-surface-variant">{getSubjectLabel(session)}</p>
        </div>
        <StatusBadge status={session.status} variant="session" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-auth-on-surface-variant">الموعد</dt>
          <dd className="font-semibold text-auth-on-surface">{formatDateTimeAr(session.scheduled_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-auth-on-surface-variant">الطلاب</dt>
          <dd className={cn("font-bold", full ? "text-danger" : "text-auth-on-surface")}>
            {enrolled.toLocaleString("ar-EG")}/{max ? max.toLocaleString("ar-EG") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-auth-on-surface-variant">السعر</dt>
          <dd className="font-bold text-peak-orange">{formatCurrencyEgp(session.price_per_student ?? 80)}</dd>
        </div>
        <div>
          <dt className="text-xs text-auth-on-surface-variant">الصف</dt>
          <dd className="font-semibold text-auth-on-surface">{gradeLabels[session.grade] || "—"}</dd>
        </div>
      </dl>

      {isScheduled && !startInfo.canStart && startInfo.reason ? (
        <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
          {startInfo.reason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/teacher/sessions/${session.id}`} className={cn(teacherBtnSecondary, "px-3 py-2 text-xs")}>
          التفاصيل
        </Link>
        <button type="button" onClick={() => onDetails?.(session)} className={cn(teacherBtnSecondary, "px-3 py-2 text-xs")}>
          معاينة سريعة
        </button>

        {isLive ? (
          <>
            <button type="button" onClick={() => onJoin?.(session.id)} className={cn(teacherBtnPrimary, "bg-danger px-3 py-2 text-xs")}>
              دخول البث
            </button>
            <button
              type="button"
              disabled={busyEnd}
              onClick={() => onEnd?.(session.id)}
              className={cn(teacherBtnSecondary, "border-danger/40 px-3 py-2 text-xs text-danger hover:bg-danger/10")}
            >
              {busyEnd ? "جارٍ..." : "إنهاء وحذف"}
            </button>
          </>
        ) : null}

        {isScheduled ? (
          <>
            <button
              type="button"
              disabled={!startInfo.canStart || busyStart}
              onClick={() => onStart?.(session.id)}
              className={cn(teacherBtnPrimary, "px-3 py-2 text-xs disabled:opacity-50")}
            >
              {busyStart ? "جارٍ البدء..." : "بدء الجلسة"}
            </button>
            <button
              type="button"
              disabled={busyCancel}
              onClick={() => onCancel?.(session)}
              className={cn(teacherBtnSecondary, "border-danger/40 px-3 py-2 text-xs text-danger hover:bg-danger/10")}
            >
              {busyCancel ? "جارٍ..." : "إلغاء وحذف"}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
