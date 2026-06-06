"use client";

import { useState } from "react";
import { toast } from "sonner";
import StatusBadge from "@/components/admin/StatusBadge";
import { adminBtnPrimary, adminBtnSecondary, adminCardSolid } from "@/lib/admin-styles";
import {
  formatCurrencyEgp,
  formatDateTimeAr,
  formatWithdrawalMethod
} from "@/lib/format";
import { cn } from "@/lib/utils";

function getTeacherName(withdrawal) {
  return withdrawal?.teacher?.user?.full_name || withdrawal?.teacher?.full_name || "—";
}

function getTeacherPhone(withdrawal) {
  return withdrawal?.teacher?.user?.phone || withdrawal?.teacher?.phone || null;
}

function DetailRow({ label, children, ltr = false }) {
  return (
    <div className="flex justify-between gap-3 border-b border-auth-outline-variant/15 pb-2">
      <dt className="text-auth-on-surface-variant">{label}</dt>
      <dd className={cn("font-bold text-auth-on-surface", ltr && "text-start")} dir={ltr ? "ltr" : undefined}>
        {children}
      </dd>
    </div>
  );
}

export default function AdminWithdrawalDetailsModal({
  withdrawal,
  busy = false,
  onClose,
  onApprove,
  onReject,
  onMarkPaid
}) {
  const [copied, setCopied] = useState(false);

  if (!withdrawal) return null;

  const teacherName = getTeacherName(withdrawal);
  const teacherPhone = getTeacherPhone(withdrawal);
  const isPending = withdrawal.status === "pending";
  const isApproved = withdrawal.status === "approved";

  const copyAccount = async () => {
    if (!withdrawal.account_number) return;
    try {
      await navigator.clipboard.writeText(withdrawal.account_number);
      setCopied(true);
      toast.success("تم نسخ رقم الحساب");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-label="إغلاق" />
      <div className={cn(adminCardSolid, "relative z-10 w-full max-w-lg p-6 shadow-2xl")}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-auth-on-surface">تفاصيل طلب السحب</h2>
            <p className="mt-1 text-2xl font-black text-peak-orange">{formatCurrencyEgp(withdrawal.amount)}</p>
          </div>
          <StatusBadge status={withdrawal.status} />
        </div>

        <dl className="space-y-3 text-sm">
          <DetailRow label="المدرس">{teacherName}</DetailRow>
          {teacherPhone ? <DetailRow label="الهاتف" ltr>{teacherPhone}</DetailRow> : null}
          <DetailRow label="طريقة السحب">{formatWithdrawalMethod(withdrawal.method)}</DetailRow>
          <DetailRow label="رقم الحساب" ltr>
            <button
              type="button"
              onClick={copyAccount}
              className="font-mono text-xs transition-colors hover:text-peak-orange"
              title="نسخ رقم الحساب"
            >
              {withdrawal.account_number || "—"}
              {withdrawal.account_number ? (
                <span className="ms-2 text-[10px] font-bold">{copied ? "✓" : "نسخ"}</span>
              ) : null}
            </button>
          </DetailRow>
          <DetailRow label="تاريخ الطلب">{formatDateTimeAr(withdrawal.requested_at)}</DetailRow>
          {withdrawal.processed_at ? (
            <DetailRow label="تاريخ المعالجة">{formatDateTimeAr(withdrawal.processed_at)}</DetailRow>
          ) : null}
          {withdrawal.notes ? <DetailRow label="ملاحظات">{withdrawal.notes}</DetailRow> : null}
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isPending ? (
            <>
              <button
                type="button"
                className={cn(adminBtnPrimary, "flex-1 bg-success text-white hover:brightness-110")}
                disabled={busy}
                onClick={() => onApprove?.(withdrawal)}
              >
                قبول الطلب
              </button>
              <button
                type="button"
                className={cn(adminBtnPrimary, "flex-1 bg-danger text-white hover:brightness-110")}
                disabled={busy}
                onClick={() => onReject?.(withdrawal)}
              >
                رفض الطلب
              </button>
            </>
          ) : null}
          {isApproved ? (
            <button
              type="button"
              className={cn(adminBtnPrimary, "flex-1 bg-accent-blue text-white hover:brightness-110")}
              disabled={busy}
              onClick={() => onMarkPaid?.(withdrawal)}
            >
              تسجيل الدفع
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
