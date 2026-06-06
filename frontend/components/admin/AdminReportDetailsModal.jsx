"use client";

import Icon from "@/components/shared/Icon";
import { adminBtnSecondary, adminModalOverlay } from "@/lib/admin-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { cn } from "@/lib/utils";

function DetailRow({ label, children, ltr = false }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-bold text-on-surface-variant">{label}</span>
      <span className={cn("text-sm font-semibold text-on-surface", ltr && "dir-ltr text-start")}>
        {children}
      </span>
    </div>
  );
}

export default function AdminReportDetailsModal({ open, item, type, periodLabel, onClose }) {
  if (!open || !item) return null;

  const isTeacher = type === "teacher";
  const title = isTeacher ? item.teacher_name : item.subject;

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="report-details-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-md-primary/15 text-lg font-black text-md-primary">
              {isTeacher ? (title || "?").slice(0, 1) : "#"}
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant">
                {isTeacher ? "تفاصيل المدرس" : "تفاصيل المادة"}
              </p>
              <h2 id="report-details-title" className="text-lg font-black text-on-surface">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="إغلاق"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low/50 p-4">
          <DetailRow label="الترتيب">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-md-primary/15 text-xs font-black text-md-primary">
              {item.rank}
            </span>
          </DetailRow>
          {isTeacher ? <DetailRow label="المادة">{item.subject || "—"}</DetailRow> : null}
          <DetailRow label="عدد الجلسات" ltr>
            {item.sessions_count.toLocaleString("ar-EG")}
          </DetailRow>
          {isTeacher ? (
            <DetailRow label="إجمالي الأرباح">
              <span className="font-black text-success">{formatCurrencyEgp(item.total_earnings)}</span>
            </DetailRow>
          ) : (
            <DetailRow label="عدد الطلاب" ltr>
              <span className="font-black text-accent-blue">
                {item.students_count.toLocaleString("ar-EG")}
              </span>
            </DetailRow>
          )}
          <DetailRow label="الفترة">{periodLabel}</DetailRow>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={adminBtnSecondary} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
