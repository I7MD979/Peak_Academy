"use client";

import { teacherBtnPrimary, teacherBtnSecondary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherSessionsMaintenance({
  openSessionsCount = 0,
  liveCount = 0,
  scheduledCount = 0,
  closingAll = false,
  countsLoading = false,
  onCloseAllOpen,
  onPurgeRooms
}) {
  return (
    <section className={cn(teacherCardSolid, "space-y-3 p-4 md:p-5")}>
      {openSessionsCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/35 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-auth-on-surface">
            لديك {openSessionsCount.toLocaleString("ar-EG")} جلسة مفتوحة (
            {liveCount.toLocaleString("ar-EG")} مباشرة، {scheduledCount.toLocaleString("ar-EG")} مجدولة)
          </p>
          <button
            type="button"
            disabled={closingAll || countsLoading}
            onClick={onCloseAllOpen}
            className={cn(teacherBtnPrimary, "bg-danger px-4 py-2 text-xs hover:brightness-110")}
          >
            {closingAll ? "جارٍ الإغلاق..." : "إغلاق كل الجلسات المفتوحة"}
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-accent-blue/25 bg-accent-blue/10 px-4 py-3 text-sm">
        <p className="font-bold text-auth-on-surface">هل البث يعمل؟</p>
        <p className={cn("mt-1", teacherMuted)}>
          في LiveKit: <strong className="text-auth-on-surface">Rooms</strong> = غرف الجلسات النشطة. الجلسة
          «مباشرة» تعني أنك بدأتها — اضغط <strong className="text-auth-on-surface">دخول البث</strong> وتأكد
          من الكاميرا والمايك.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={cn("text-sm", teacherMuted)}>
          غرف LiveKit القديمة تبقى في اللوحة حتى تضغط تنظيف بدون دخول المكالمة.
        </p>
        <button
          type="button"
          disabled={closingAll || countsLoading}
          onClick={onPurgeRooms}
          className={cn(teacherBtnSecondary, "shrink-0 px-4 py-2 text-xs")}
        >
          تنظيف غرف LiveKit
        </button>
      </div>
    </section>
  );
}
