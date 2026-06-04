"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { initiatePayment } from "@/lib/paymob";
import { formatCurrencyEgp } from "@/lib/format";

export default function PaymentModal({ session, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const priceLabel =
    session?.price_label || formatCurrencyEgp(session?.price_per_student);

  const handlePay = async () => {
    try {
      setLoading(true);
      setError("");
      const { checkoutUrl, transactionId } = await initiatePayment(session?.price_per_student, session?.id);
      if (!checkoutUrl) throw new Error("لم يتم استلام رابط الدفع");
      if (transactionId && session?.id) {
        sessionStorage.setItem(`peak-tx-${session.id}`, transactionId);
      }
      window.location.href = checkoutUrl;
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || "تعذر بدء عملية الدفع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-text">تأكيد الحجز والدفع</h3>
          <p className="mt-1 text-sm text-text-muted">{session?.title || "جلسة تعليمية"}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-bg"
            aria-label="إغلاق"
          >
            <Icon name="close" size={20} />
          </button>
        ) : null}
      </div>

      <div className="rounded-xl bg-bg p-4">
        <p className="text-xs text-text-muted">المبلغ المطلوب</p>
        <p className="mt-1 text-2xl font-black text-accent">{priceLabel}</p>
        <p className="mt-2 text-xs text-text-muted">
          بعد الدفع سيتم تسجيلك في الجلسة وستصلك إمكانية الدخول عند بدء البث.
        </p>
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1 rounded-xl"
          variant="accent"
          disabled={loading}
          onClick={handlePay}
        >
          {loading ? "جارٍ التحويل..." : "الدفع الآن"}
        </Button>
        {onClose ? (
          <Button className="rounded-xl" variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
        ) : null}
      </div>
    </div>
  );
}
