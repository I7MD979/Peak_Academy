"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import Icon from "@/components/shared/Icon";
import { adminBtnPrimary, adminBtnSecondary, adminModalOverlay } from "@/lib/admin-styles";
import { formatCurrencyEgp, formatDateAr } from "@/lib/format";
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

export default function AdminPlanDetailsModal({ open, plan, onClose, onEdit, onToggle }) {
  if (!open || !plan) return null;

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="plan-details-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-md-primary/15 text-md-primary">
              <Icon name="creditCard" size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant">تفاصيل الخطة</p>
              <h2 id="plan-details-title" className="text-lg font-black text-on-surface">
                {plan.name}
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
          <DetailRow label="السعر">
            <span className="font-black text-md-primary">{formatCurrencyEgp(plan.price)}</span>
          </DetailRow>
          <DetailRow label="حصص شهرياً" ltr>
            {plan.sessions_per_month.toLocaleString("ar-EG")}
          </DetailRow>
          <DetailRow label="المشتركون النشطون" ltr>
            {(plan.active_subscribers || 0).toLocaleString("ar-EG")}
          </DetailRow>
          <DetailRow label="الحالة">
            <StatusBadge status={plan.is_active ? "active" : "suspended"} />
          </DetailRow>
          <DetailRow label="مميزة على الهبوط">
            {plan.is_featured ? (
              <span className="rounded-full bg-md-primary/15 px-2 py-0.5 text-xs font-bold text-md-primary">
                {plan.featured_label || "مميزة"}
              </span>
            ) : (
              "لا"
            )}
          </DetailRow>
          <DetailRow label="الترتيب" ltr>
            {plan.sort_order ?? 0}
          </DetailRow>
          {plan.description ? <DetailRow label="الوصف">{plan.description}</DetailRow> : null}
          {plan.updated_at ? (
            <DetailRow label="آخر تحديث">{formatDateAr(plan.updated_at)}</DetailRow>
          ) : null}
        </div>

        {plan.features?.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-on-surface-variant">المميزات</p>
            <ul className="flex flex-wrap gap-2">
              {plan.features.map((feature, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs text-on-surface"
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={adminBtnPrimary} onClick={() => onEdit?.(plan)}>
            تعديل
          </button>
          <button type="button" className={adminBtnSecondary} onClick={() => onToggle?.(plan)}>
            {plan.is_active ? "إيقاف الخطة" : "تفعيل الخطة"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
