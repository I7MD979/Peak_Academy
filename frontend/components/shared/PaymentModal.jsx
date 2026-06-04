"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";
import { paymentsApi, sessionsApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";

const PAYMENT_TYPES = [
  { id: "pay_per_session", label: "دفع الحصة" },
  { id: "free_trial", label: "أول حصة مجانية" },
  { id: "subscription", label: "استخدام الاشتراك" }
];

export default function PaymentModal({ session, checkoutOptions = {}, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [paymentType, setPaymentType] = useState("pay_per_session");

  const originalPrice = Number(session?.price_per_student || 0);
  const freeTrialAvailable = checkoutOptions.free_trial_available;
  const hasSubscription =
    checkoutOptions.active_subscription?.sessions_remaining > 0;

  const availableTypes = PAYMENT_TYPES.filter((t) => {
    if (t.id === "free_trial") return freeTrialAvailable;
    if (t.id === "subscription") return hasSubscription;
    return true;
  });

  useEffect(() => {
    if (freeTrialAvailable && !hasSubscription) {
      setPaymentType("free_trial");
    } else if (hasSubscription) {
      setPaymentType("subscription");
    }
  }, [freeTrialAvailable, hasSubscription]);

  const validatePromo = useCallback(async () => {
    if (!promoCode.trim() || paymentType !== "pay_per_session") {
      setPromoPreview(null);
      return;
    }
    setPromoLoading(true);
    try {
      const res = await paymentsApi.validatePromo({
        code: promoCode,
        session_id: session?.id,
        payment_type: "pay_per_session"
      });
      setPromoPreview(res?.data || null);
    } catch (err) {
      setPromoPreview({ valid: false, reason: err.message });
    } finally {
      setPromoLoading(false);
    }
  }, [promoCode, paymentType, session?.id]);

  useEffect(() => {
    const t = setTimeout(validatePromo, 400);
    return () => clearTimeout(t);
  }, [validatePromo]);

  const displayOriginal = promoPreview?.valid
    ? promoPreview.original_price
    : originalPrice;
  const displayDiscount = promoPreview?.valid ? promoPreview.discount_amount : 0;
  const displayFinal = promoPreview?.valid ? promoPreview.final_price : originalPrice;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");

      const body = {
        payment_type: paymentType,
        promo_code: paymentType === "pay_per_session" && promoCode.trim() ? promoCode.trim() : undefined
      };

      const res = await sessionsApi.enroll(session.id, body);
      const data = res?.data;

      if (data?.checkout_url) {
        if (data.transaction_id) {
          sessionStorage.setItem(`peak-tx-${session.id}`, data.transaction_id);
        }
        window.location.href = data.checkout_url;
        if (onClose) onClose();
        return;
      }

      if (onSuccess) onSuccess(data?.enrollment);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || "تعذر إتمام التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const payLabel =
    paymentType === "free_trial"
      ? "تأكيد الحصة المجانية"
      : paymentType === "subscription"
        ? "تأكيد بالاشتراك"
        : displayFinal <= 0
          ? "تأكيد التسجيل"
          : `ادفع الآن — ${formatCurrencyEgp(displayFinal)}`;

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

      {checkoutOptions.low_seats ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
          متاح {checkoutOptions.seats_left} أماكن فقط
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold text-text-muted">طريقة الدفع</p>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPaymentType(t.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                paymentType === t.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {paymentType === "pay_per_session" ? (
        <>
          <div>
            <label className="text-xs font-bold text-text-muted">كود الخصم</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="أدخل الكود"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            />
            {promoLoading ? (
              <p className="mt-1 text-xs text-text-muted">جارٍ التحقق...</p>
            ) : null}
            {promoPreview && !promoPreview.valid ? (
              <p className="mt-1 text-xs font-semibold text-danger">{promoPreview.reason}</p>
            ) : null}
          </div>

          <div className="rounded-xl bg-bg p-4 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>السعر الأصلي</span>
              <span>{formatCurrencyEgp(displayOriginal)}</span>
            </div>
            {displayDiscount > 0 ? (
              <div className="mt-1 flex justify-between text-success">
                <span>الخصم</span>
                <span>− {formatCurrencyEgp(displayDiscount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-black text-accent">
              <span>السعر النهائي</span>
              <span>{formatCurrencyEgp(displayFinal)}</span>
            </div>
          </div>
        </>
      ) : paymentType === "subscription" ? (
        <p className="text-sm text-text-muted">
          سيتم خصم حصة واحدة من اشتراكك (
          {checkoutOptions.active_subscription?.sessions_remaining} متبقية)
        </p>
      ) : (
        <p className="text-sm text-text-muted">الحصة الأولى مع هذا المدرس في هذه المادة — مجاناً</p>
      )}

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          className="flex-1 rounded-xl"
          variant="accent"
          disabled={loading || (paymentType === "pay_per_session" && promoPreview && !promoPreview.valid && promoCode.trim())}
          onClick={handleConfirm}
        >
          {loading ? "جارٍ المعالجة..." : payLabel}
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
