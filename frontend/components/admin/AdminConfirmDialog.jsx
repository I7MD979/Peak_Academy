"use client";

import { adminBtnPrimary, adminBtnSecondary, adminCardSolid } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

const toneMap = {
  danger: "bg-danger hover:brightness-110",
  success: "bg-success hover:brightness-110",
  primary: "bg-peak-orange hover:brightness-110"
};

export default function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  loading = false,
  onClose,
  onConfirm
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-md p-6 shadow-2xl")}>
        <h2 className="text-lg font-bold text-auth-on-surface">{title}</h2>
        {description ? <p className="mt-2 text-sm text-auth-on-surface-variant">{description}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" className={cn(adminBtnSecondary, "flex-1")} onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(adminBtnPrimary, "flex-1 text-white", toneMap[tone] || toneMap.primary)}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "جاري التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
