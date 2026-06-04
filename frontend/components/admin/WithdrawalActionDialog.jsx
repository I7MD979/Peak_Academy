"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrencyEgp } from "@/lib/format";

const actionCopy = {
  approved: {
    title: "تأكيد قبول طلب السحب",
    description: "سيتم قبول الطلب ويمكنك لاحقًا تسجيل الدفع.",
    confirm: "تأكيد القبول",
    tone: "bg-success hover:bg-green-600"
  },
  rejected: {
    title: "تأكيد رفض طلب السحب",
    description: "سيتم رفض الطلب ولن يتم تحويل المبلغ.",
    confirm: "تأكيد الرفض",
    tone: "bg-danger hover:bg-red-500"
  },
  paid: {
    title: "تأكيد تسجيل الدفع",
    description: "سيتم تسجيل أن المبلغ تم تحويله للمدرس.",
    confirm: "تأكيد الدفع",
    tone: "bg-accent-blue hover:bg-blue-500"
  }
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
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" dir="rtl">
        <h2 className="text-lg font-black text-primary">{copy.title}</h2>
        <p className="mt-2 text-sm text-text-muted">{copy.description}</p>

        <div className="mt-4 space-y-2 rounded-xl bg-bg p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">المدرس</span>
            <span className="font-bold">{teacherName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-muted">المبلغ</span>
            <span className="font-black text-accent">{formatCurrencyEgp(withdrawal.amount)}</span>
          </div>
        </div>

        {action === "rejected" ? (
          <div className="mt-4">
            <label htmlFor="reject-reason" className="mb-1 block text-sm font-bold">
              سبب الرفض (اختياري)
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="اكتب سبب الرفض للمدرس..."
              className="w-full resize-none rounded-xl border border-border p-3 text-sm font-cairo focus:border-accent focus:outline-none"
            />
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            type="button"
            className={`flex-1 rounded-xl text-white ${copy.tone}`}
            disabled={loading}
            onClick={() => onConfirm(action === "rejected" ? { status: action, reason: reason.trim() } : { status: action })}
          >
            {loading ? "جاري التنفيذ..." : copy.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
