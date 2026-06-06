"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid } from "@/lib/admin-styles";
import {
  formatCurrencyEgp,
  formatDateTimeAr,
  formatGradeAr,
  formatSchoolLevelAr
} from "@/lib/format";
import { cn } from "@/lib/utils";

function getEnrollmentCount(session) {
  return session?.enrollments?.[0]?.count ?? session?.enrollment_count ?? 0;
}

export default function SessionDetailsModal({
  session,
  busy = false,
  canCancel = false,
  onClose,
  onCancel
}) {
  if (!session) return null;

  const enrolled = getEnrollmentCount(session);
  const max = session.max_students || 0;
  const isFull = max > 0 && enrolled >= max;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-lg p-6 shadow-2xl")} dir="rtl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-auth-on-surface-variant">تفاصيل الجلسة</p>
            <h2 className="mt-1 text-lg font-black text-auth-on-surface">{session.title}</h2>
          </div>
          <StatusBadge status={session.status} variant="session" />
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">المدرس</dt>
            <dd className="font-bold text-auth-on-surface">{session.teacher?.full_name || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">المادة</dt>
            <dd className="font-bold text-auth-on-surface">
              {session.subject?.icon ? `${session.subject.icon} ` : ""}
              {session.subject?.name_ar || session.subject || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">الموعد</dt>
            <dd className="font-bold text-auth-on-surface">{formatDateTimeAr(session.scheduled_at)}</dd>
          </div>
          {session.school_level ? (
            <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
              <dt className="text-auth-on-surface-variant">المرحلة</dt>
              <dd className="font-bold text-auth-on-surface">{formatSchoolLevelAr(session.school_level)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">الصف</dt>
            <dd className="font-bold text-auth-on-surface">{formatGradeAr(session.grade)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">المدة</dt>
            <dd className="font-bold text-auth-on-surface">
              {session.duration_min ? `${session.duration_min} دقيقة` : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">الطلاب المسجلون</dt>
            <dd className={cn("font-bold", isFull ? "text-danger" : "text-auth-on-surface")}>
              {enrolled}/{max || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">السعر للطالب</dt>
            <dd className="font-bold text-md-primary">{formatCurrencyEgp(session.price_per_student)}</dd>
          </div>
        </dl>

        {session.description ? (
          <div className="mt-4 rounded-xl bg-auth-surface-low p-3">
            <p className="mb-1 text-xs font-bold text-auth-on-surface-variant">الوصف</p>
            <p className="text-sm leading-relaxed text-auth-on-surface">{session.description}</p>
          </div>
        ) : null}

        {session.status === "live" ? (
          <p className="mt-4 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400">
            هذه الجلسة مباشرة الآن — الإلغاء سيوقف البث ويُعيد المبالغ للطلاب.
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {canCancel ? (
            <button
              type="button"
              className={cn(adminBtnPrimary, "flex-1 bg-danger text-white hover:brightness-110")}
              disabled={busy}
              onClick={() => onCancel?.(session)}
            >
              {busy ? "جاري الإلغاء..." : "إلغاء الجلسة"}
            </button>
          ) : null}
          <button type="button" className={cn(adminBtnSecondary, "flex-1 sm:flex-none")} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
