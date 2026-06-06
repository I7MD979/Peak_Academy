"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
import { getEnrollmentCount, getSubjectLabel, gradeLabels } from "@/lib/teacher-sessions";
import { teacherBtnSecondary, teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherSessionDetailsModal({ session, onClose }) {
  if (!session) return null;

  const enrolled = getEnrollmentCount(session);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={cn(teacherCardSolid, "relative z-10 w-full max-w-lg p-6 shadow-2xl")} dir="rtl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-auth-on-surface">تفاصيل الجلسة</h2>
            <p className={cn("mt-1 text-sm", teacherMuted)}>{session.title}</p>
          </div>
          <StatusBadge status={session.status} variant="session" />
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>المادة</span>
            <span className="font-bold text-auth-on-surface">{getSubjectLabel(session)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>الموعد</span>
            <span className="font-bold text-auth-on-surface">{formatDateTimeAr(session.scheduled_at)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>الصف</span>
            <span className="font-bold text-auth-on-surface">
              {gradeLabels[session.grade] || session.grade || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>المدة</span>
            <span className="font-bold text-auth-on-surface">
              {session.duration_min ? `${session.duration_min} دقيقة` : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>الطلاب المسجلون</span>
            <span className="font-bold text-auth-on-surface">
              {enrolled.toLocaleString("ar-EG")}/{session.max_students?.toLocaleString("ar-EG") || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className={teacherMuted}>السعر للطالب</span>
            <span className="font-bold text-peak-orange">{formatCurrencyEgp(session.price_per_student)}</span>
          </div>
          {session.description ? (
            <div className="rounded-xl border border-auth-outline-variant/30 bg-auth-surface-low p-3">
              <p className={cn("mb-1 text-xs", teacherMuted)}>الوصف</p>
              <p className="leading-relaxed text-auth-on-surface">{session.description}</p>
            </div>
          ) : null}
        </div>

        <button type="button" className={cn(teacherBtnSecondary, "mt-5 w-full justify-center")} onClick={onClose}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
