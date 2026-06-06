"use client";

import { useEffect, useState } from "react";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid, adminInput, adminLabel } from "@/lib/admin-styles";
import { formatCurrencyEgp, formatWithdrawalMethod } from "@/lib/format";
import { cn } from "@/lib/utils";

const actionCopy = {
  approved: {
    title: "تأكيد قبول طلب السحب",
    description: "سيتم قبول الطلب ويمكنك لاحقًا تسجيل الدفع.",
    confirm: "تأكيد القبول",
    tone: "success"
  },
  rejected: {
    title: "تأكيد رفض طلب السحب",
    description: "سيتم رفض الطلب ولن يتم تحويل المبلغ.",
    confirm: "تأكيد الرفض",
    tone: "danger"
  },
  paid: {
    title: "تأكيد تسجيل الدفع",
    description: "سيتم تسجيل أن المبلغ تم تحويله للمدرس.",
    confirm: "تأكيد الدفع",
    tone: "primary"
  }
};

const toneMap = {
  success: "bg-success hover:brightness-110",
  danger: "bg-danger hover:brightness-110",
  primary: "bg-accent-blue hover:brightness-110"
};

export default function WithdrawalActionDialog({ open, withdrawal, action, loading, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, withdrawal?.id, action]);

  if (!open || !withdrawal || !action) return null;

  const copy = actionCopy[action];
  const teacherName = withdrawal.teacher?.user?.full_name || "المدرس";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="إغلاق" />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-md p-6 shadow-2xl")} dir="rtl">
        <h2 className="text-lg font-black text-auth-on-surface">{copy.title}</h2>
        <p className="mt-2 text-sm text-auth-on-surface-variant">{copy.description}</p>

        <div className="mt-4 space-y-2 rounded-xl bg-auth-surface-low p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-auth-on-surface-variant">المدرس</span>
            <span className="font-bold text-auth-on-surface">{teacherName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-auth-on-surface-variant">المبلغ</span>
            <span className="font-black text-md-primary">{formatCurrencyEgp(withdrawal.amount)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-auth-on-surface-variant">طريقة السحب</span>
            <span className="font-bold text-auth-on-surface">{formatWithdrawalMethod(withdrawal.method)}</span>
          </div>
          {withdrawal.account_number ? (
            <div className="flex justify-between gap-3">
              <span className="text-auth-on-surface-variant">رقم الحساب</span>
              <span className="font-mono text-xs text-auth-on-surface" dir="ltr">
                {withdrawal.account_number}
              </span>
            </div>
          ) : null}
        </div>

        {action === "rejected" ? (
          <div className="mt-4">
            <label htmlFor="reject-reason" className={adminLabel}>
              سبب الرفض (اختياري)
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب الرفض للمدرس..."
              className={cn(adminInput, "mt-1 min-h-[88px] resize-none py-3")}
            />
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button type="button" className={cn(adminBtnSecondary, "flex-1")} onClick={onClose} disabled={loading}>
            إلغاء
          </button>
          <button
            type="button"
            className={cn(adminBtnPrimary, "flex-1 text-white", toneMap[copy.tone])}
            disabled={loading}
            onClick={() =>
              onConfirm(action === "rejected" ? { status: action, reason: reason.trim() } : { status: action })
            }
          >
            {loading ? "جاري التنفيذ..." : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
