"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import StatusBadge from "@/components/admin/StatusBadge";
import Icon from "@/components/shared/Icon";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { adminPromotionsApi } from "@/lib/api";
import { adminBtnPrimary, adminBtnSecondary, adminModalOverlay } from "@/lib/admin-styles";
import { formatCurrencyEgp, formatDateTimeAr } from "@/lib/format";
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

export default function AdminPromotionDetailsModal({
  open,
  promo,
  typeLabel,
  discountLabel,
  appliesLabel,
  expired,
  onClose,
  onEdit,
  onToggle
}) {
  const [uses, setUses] = useState([]);
  const [usesLoading, setUsesLoading] = useState(false);

  useEffect(() => {
    if (!open || !promo?.id) return;
    let cancelled = false;
    setUsesLoading(true);
    adminPromotionsApi
      .uses(promo.id)
      .then((res) => {
        if (!cancelled) setUses(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setUses([]);
      })
      .finally(() => {
        if (!cancelled) setUsesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, promo?.id]);

  if (!open || !promo) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      toast.success("تم نسخ الكود");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className={adminModalOverlay} role="dialog" aria-modal="true" aria-labelledby="promo-details-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-high p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-md-primary/15 text-md-primary">
              <Icon name="tag" size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant">تفاصيل العرض</p>
              <h2 id="promo-details-title" className="font-mono text-lg font-black text-md-primary" dir="ltr">
                {promo.code}
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
          <DetailRow label="النوع">{typeLabel}</DetailRow>
          <DetailRow label="الخصم">{discountLabel}</DetailRow>
          <DetailRow label="ينطبق على">{appliesLabel}</DetailRow>
          <DetailRow label="الحالة">
            {expired ? (
              <span className="rounded-full bg-error/15 px-2.5 py-1 text-xs font-bold text-error">منتهي</span>
            ) : (
              <StatusBadge status={promo.is_active ? "active" : "suspended"} />
            )}
          </DetailRow>
          <DetailRow label="الاستخدام" ltr>
            {promo.used_count ?? 0}
            {promo.max_uses ? ` / ${promo.max_uses}` : " / ∞"}
          </DetailRow>
          {promo.per_user_limit ? (
            <DetailRow label="حد لكل مستخدم" ltr>
              {promo.per_user_limit}
            </DetailRow>
          ) : null}
          {promo.min_sessions ? (
            <DetailRow label="الحد الأدنى للحصص" ltr>
              {promo.min_sessions}
            </DetailRow>
          ) : null}
          {promo.bonus_sessions ? (
            <DetailRow label="حصص إضافية" ltr>
              {promo.bonus_sessions}
            </DetailRow>
          ) : null}
          {promo.expires_at ? (
            <DetailRow label="ينتهي في">{formatDateTimeAr(promo.expires_at)}</DetailRow>
          ) : null}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-on-surface-variant">سجل الاستخدام</p>
          {usesLoading ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-4">
              <SectionLoader message="جاري تحميل الاستخدامات..." />
            </div>
          ) : uses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/30 p-4 text-sm text-on-surface-variant">
              لم يُستخدم هذا العرض بعد
            </p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-low/40 p-3">
              {uses.slice(0, 10).map((use) => (
                <li
                  key={use.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-high/60 px-3 py-2 text-sm"
                >
                  <span className="truncate text-on-surface">{use.user?.full_name || "مستخدم"}</span>
                  <span className="shrink-0 font-bold text-md-primary">
                    {formatCurrencyEgp(use.discount_applied)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={adminBtnPrimary} onClick={handleCopy}>
            نسخ الكود
          </button>
          <button type="button" className={adminBtnSecondary} onClick={() => onEdit?.(promo)}>
            تعديل
          </button>
          <button type="button" className={adminBtnSecondary} onClick={() => onToggle?.(promo)}>
            {promo.is_active ? "إيقاف" : "تفعيل"}
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
