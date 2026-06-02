"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";

const gradeLabels = {
  first: "أولى ثانوي",
  second: "تانية ثانوي",
  third: "تالتة ثانوي"
};

function getEnrollmentCount(session) {
  return session?.enrollments?.[0]?.count ?? 0;
}

export default function SessionDetailsModal({ session, onClose }) {
  if (!session) return null;

  const enrolled = getEnrollmentCount(session);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" dir="rtl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-primary">تفاصيل الجلسة</h2>
            <p className="mt-1 text-sm text-text-muted">{session.title}</p>
          </div>
          <StatusBadge status={session.status} />
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">المدرس</span>
            <span className="font-bold">{session.teacher?.full_name || "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">المادة</span>
            <span className="font-bold">
              {session.subject?.icon ? `${session.subject.icon} ` : ""}
              {session.subject?.name_ar || session.subject || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">الموعد</span>
            <span className="font-bold">{formatDateTimeAr(session.scheduled_at)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">الصف</span>
            <span className="font-bold">{gradeLabels[session.grade] || session.grade || "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">المدة</span>
            <span className="font-bold">{session.duration_min ? `${session.duration_min} دقيقة` : "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">الطلاب</span>
            <span className="font-bold">
              {enrolled}/{session.max_students || "—"}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">السعر للطالب</span>
            <span className="font-bold text-accent">{formatCurrencyEgp(session.price_per_student)}</span>
          </div>
          {session.description ? (
            <div className="rounded-xl bg-bg p-3">
              <p className="mb-1 text-xs text-text-muted">الوصف</p>
              <p className="leading-relaxed text-text">{session.description}</p>
            </div>
          ) : null}
        </div>

        <Button type="button" className="mt-5 w-full rounded-xl" variant="outline" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  );
}
