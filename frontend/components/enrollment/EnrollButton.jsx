"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  sessionsApi,
  subscriptionsApi,
  enrollmentsApi,
  promotionsApi,
  studentApi
} from "@/lib/api";
import { clearApiCache } from "@/lib/api";
import { toast } from "sonner";

function normalizePaymentType(trialStatus, subStatus) {
  if (!trialStatus?.used && trialStatus?.free_trial_available !== false) {
    if (trialStatus?.free_trial_available) return "free_trial";
  }
  if ((subStatus?.sessions_remaining ?? subStatus?.subscription?.sessions_remaining ?? 0) > 0) {
    return "subscription";
  }
  return "per_session";
}

export default function EnrollButton({
  sessionId,
  sessionPrice = 0,
  teacherId,
  subjectId,
  isFull = false,
  className = ""
}) {
  const qc = useQueryClient();
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState(null);
  const [showPromo, setShowPromo] = useState(false);

  const { data: trialStatus } = useQuery({
    queryKey: ["trial-status", teacherId, subjectId],
    queryFn: async () => {
      const res = await enrollmentsApi.trialStatus({ teacher_id: teacherId, subject_id: subjectId });
      return res?.data ?? res;
    },
    enabled: Boolean(teacherId && subjectId)
  });

  const { data: subStatus } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: async () => {
      const res = await subscriptionsApi.me();
      return res?.data ?? res;
    }
  });

  const { data: options } = useQuery({
    queryKey: ["enrollment-options", sessionId],
    queryFn: async () => {
      const res = await studentApi.enrollmentOptions(sessionId);
      return res?.data ?? res;
    },
    enabled: Boolean(sessionId)
  });

  const paymentType = normalizePaymentType(
    { ...trialStatus, free_trial_available: options?.free_trial_available ?? trialStatus?.free_trial_available },
    subStatus
  );

  const enrollMutation = useMutation({
    mutationFn: (payload) => sessionsApi.enroll(sessionId, payload),
    onSuccess: (res) => {
      const data = res?.data ?? res;
      const url = data?.paymob_url || data?.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      clearApiCache();
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["student-sessions"] });
      qc.invalidateQueries({ queryKey: ["subscription-status"] });
      toast.success("تم الحجز بنجاح");
    },
    onError: (err) => {
      toast.error(err.message || "تعذر إتمام الحجز");
    }
  });

  const validatePromo = async () => {
    try {
      const res = await promotionsApi.validate({
        code: promoCode,
        payment_type: "per_session",
        session_id: sessionId
      });
      const data = res?.data ?? res;
      setPromoResult({
        discount: data.discount ?? 0,
        message: data.message || (data.valid ? "تم تفعيل الكود" : "كود غير صحيح")
      });
    } catch (e) {
      setPromoResult({ discount: 0, message: e.message || "كود غير صحيح" });
    }
  };

  const price = Number(sessionPrice) || 0;
  const finalPrice = Math.max(0, price - (promoResult?.discount || 0));
  const sessionsRemaining =
    subStatus?.sessions_remaining ?? subStatus?.subscription?.sessions_remaining ?? 0;

  if (isFull) {
    return (
      <button
        type="button"
        disabled
        className={`w-full cursor-not-allowed rounded-xl bg-auth-surface-highest py-3 font-bold text-auth-on-surface-variant ${className}`}
      >
        الحصة ممتلئة
      </button>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {paymentType === "free_trial" ? (
        <div className="rounded-lg border border-success/30 bg-success/10 py-2 text-center text-sm font-bold text-success">
          أول حصة مجانية مع هذا المدرس
        </div>
      ) : null}
      {paymentType === "subscription" ? (
        <div className="rounded-lg border border-peak-orange/30 bg-peak-orange/10 py-2 text-center text-sm font-bold text-peak-orange">
          من رصيد اشتراكك ({sessionsRemaining} حصة متبقية)
        </div>
      ) : null}

      {paymentType === "per_session" ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPromo(!showPromo)}
            className="text-sm text-peak-orange hover:underline"
          >
            عندك كود خصم؟
          </button>
          {showPromo ? (
            <div className="mt-2 flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="أدخل الكود"
                className="flex-1 rounded-lg border border-auth-outline-variant/40 bg-auth-surface-low px-3 py-2 text-sm text-auth-on-surface outline-none focus:border-peak-orange/50"
              />
              <button
                type="button"
                onClick={validatePromo}
                className="rounded-lg bg-peak-orange px-4 py-2 text-sm font-bold text-white hover:bg-peak-orange/90"
              >
                تفعيل
              </button>
            </div>
          ) : null}
          {promoResult ? (
            <p
              className={`mt-1 text-xs ${promoResult.discount > 0 ? "text-success" : "text-danger"}`}
            >
              {promoResult.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {paymentType === "per_session" ? (
        <div className="flex items-center justify-between px-1 text-sm">
          <span className="text-auth-on-surface-variant">السعر</span>
          <div className="text-left">
            {promoResult?.discount > 0 ? (
              <span className="ml-2 text-auth-on-surface-variant/70 line-through">{price} جنيه</span>
            ) : null}
            <span className="font-bold text-auth-on-surface">{finalPrice} جنيه</span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          enrollMutation.mutate({
            payment_type: paymentType,
            promo_code: promoCode || undefined
          })
        }
        disabled={enrollMutation.isPending}
        className="w-full rounded-xl bg-peak-orange py-3 font-bold text-white transition-all hover:bg-peak-orange/90 disabled:opacity-50"
      >
        {enrollMutation.isPending
          ? "جاري الحجز..."
          : paymentType === "free_trial"
            ? "احجز مجاناً"
            : paymentType === "subscription"
              ? "احجز من اشتراكك"
              : `ادفع ${finalPrice} جنيه`}
      </button>
    </div>
  );
}
