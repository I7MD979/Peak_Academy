"use client";

import {
  getStartAvailability,
  isLiveSession,
  isScheduledSession
} from "@/lib/teacher-sessions";
import { getTeacherTeachingGate } from "@/lib/teacher-verification";
import { teacherBtnPrimary, teacherBtnSecondary } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherSessionRowActions({
  session,
  actionId = "",
  onDetails,
  onStart,
  onEnd,
  onCancel,
  onJoin,
  verificationStatus
}) {
  const startInfo = getStartAvailability(session, verificationStatus);
  const teachingGate = getTeacherTeachingGate(verificationStatus);
  const busyStart = actionId === `start-${session.id}`;
  const busyEnd = actionId === `end-${session.id}`;
  const busyCancel = actionId === `cancel-${session.id}`;

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <button type="button" onClick={() => onDetails?.(session)} className={cn(teacherBtnSecondary, "px-3 py-2 text-xs")}>
        التفاصيل
      </button>

      {isLiveSession(session) ? (
        <>
          <button
            type="button"
            disabled={!teachingGate.allowed}
            title={!teachingGate.allowed ? teachingGate.reason : undefined}
            onClick={() => teachingGate.allowed && onJoin?.(session.id)}
            className={cn(teacherBtnPrimary, "bg-danger px-3 py-2 text-xs disabled:opacity-50")}
          >
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

      {isScheduledSession(session) ? (
        <>
          <button
            type="button"
            disabled={!startInfo.canStart || busyStart}
            title={startInfo.reason || undefined}
            onClick={() => onStart?.(session.id)}
            className={cn(teacherBtnPrimary, "px-3 py-2 text-xs disabled:opacity-50")}
          >
            {busyStart ? "جارٍ..." : "بدء"}
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
  );
}
