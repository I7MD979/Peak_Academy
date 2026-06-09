"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import StudentSubscriptionView from "@/components/student/StudentSubscriptionPage";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import { paymentsApi, subscriptionsApi, newIdempotencyKey } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  studentBtnPrimary,
  studentMuted
} from "@/lib/student-styles";
import { pollPaymentOrderFulfillment } from "@/lib/paymob";
import {
  findAutostartPlan,
  resolveSubscriptionPaymentId,
  SUBSCRIPTION_TX_STORAGE_KEY
} from "@/lib/student-subscription";

function StudentSubscriptionContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [plans, setPlans] = useState([]);
  const [me, setMe] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("paymob");
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [selectedPlanAmount, setSelectedPlanAmount] = useState(null);
  const autoStartedRef = useRef(false);

  const [activatingTrial, setActivatingTrial] = useState(false);
  const [trialActivated, setTrialActivated]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([subscriptionsApi.plans(), subscriptionsApi.me()]);
      setPlans(plansRes?.data || []);
      setMe(meRes?.data || null);
    } catch (err) {
      setError(err.message || "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (searchParams.get("paid") !== "1") return;

    const paymentId = resolveSubscriptionPaymentId(searchParams);
    if (paymentId) sessionStorage.removeItem(SUBSCRIPTION_TX_STORAGE_KEY);
    if (!paymentId) {
      load();
      return;
    }

    let active = true;
    (async () => {
      await pollPaymentOrderFulfillment(paymentId);
      if (active) await load();
    })();

    return () => {
      active = false;
    };
  }, [load, searchParams]);

  const handleActivateTrial = async () => {
    setActivatingTrial(true);
    try {
      await subscriptionsApi.activateTrial();
      setTrialActivated(true);
      await load();
      toast.success("تم تفعيل التجربة المجانية لمدة 30 يوم 🎉");
    } catch (err) {
      toast.error(err.message || "تعذر تفعيل التجربة");
    } finally {
      setActivatingTrial(false);
    }
  };

  const handlePurchase = useCallback(
    async (planId) => {
      try {
        setPurchasing(planId);
        setError("");
        setCheckoutResult(null);

        const plan = plans.find((p) => p.id === planId);
        const amount = Number(plan?.price || 0);
        setSelectedPlanAmount(amount);

        // ── Paymob / other providers path ─────────────────────────────────
        const idempotencyKey = newIdempotencyKey("sub");
        const res = await paymentsApi.createOrder(
          {
            provider: paymentProvider,
            planId,
            amount,
            metadata: {
              type: "subscription_payment",
              promo_code: promoCode.trim() || undefined
            }
          },
          idempotencyKey
        );

        const data = res?.data;
        if (!data) throw new Error("استجابة غير صالحة من الخادم");

        if (data.paymentUrl || data.iframeUrl) {
          // Store payment ID before redirect so the return polling uses the correct UUID
          if (data.paymentId) {
            sessionStorage.setItem(SUBSCRIPTION_TX_STORAGE_KEY, data.paymentId);
          }
          window.location.href = data.paymentUrl || data.iframeUrl;
          return;
        }

        if (data.referenceCode || data.provider === "fawry" || data.provider === "instapay") {
          setCheckoutResult({
            provider: data.provider || paymentProvider,
            referenceCode: data.referenceCode,
            ipaAlias: data.ipaAlias,
            amountEGP: data.amountEGP,
            expiresAt: data.expiresAt,
            paymentId: data.paymentId,
            instructions: data.instructions
          });
          if (data.paymentId) {
            sessionStorage.setItem(SUBSCRIPTION_TX_STORAGE_KEY, data.paymentId);
          }
          return;
        }

        const legacy = await subscriptionsApi.purchase(planId, promoCode.trim() || undefined);
        const url = legacy?.data?.checkout_url;
        if (url) {
          if (legacy?.data?.transaction_id) {
            sessionStorage.setItem(SUBSCRIPTION_TX_STORAGE_KEY, legacy.data.transaction_id);
          }
          window.location.href = url;
        }
      } catch (err) {
        setError(err.message || "تعذر بدء الدفع");
      } finally {
        setPurchasing(null);
      }
    },
    [promoCode, paymentProvider, plans]
  );

  useEffect(() => {
    if (loading || autoStartedRef.current || !plans.length || me?.subscription) return;

    const targetPlan = findAutostartPlan(plans, searchParams);
    if (!targetPlan) return;

    autoStartedRef.current = true;
    const timer = setTimeout(() => {
      handlePurchase(targetPlan.id);
    }, 500);
    return () => clearTimeout(timer);
  }, [plans, loading, me, handlePurchase, searchParams]);

  if (loading) {
    return <PageLoader />;
  }

  const hasActiveSub = me?.subscription?.status === "active" || me?.subscription?.status === "trialing";

  return (
    <div>
      {/* Trial CTA — show only if no active subscription and trial not yet activated this session */}
      {!hasActiveSub && !trialActivated && (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <section className="rounded-2xl border border-dashed border-peak-orange/50 bg-peak-orange/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black text-auth-on-surface text-base">
                  🎁 جرّب غرف المذاكرة مجاناً لمدة 30 يوم
                </p>
                <p className={cn("text-sm mt-1", studentMuted)}>
                  بدون بطاقة ائتمان — مرة واحدة فقط لكل حساب
                </p>
              </div>
              <button
                type="button"
                onClick={handleActivateTrial}
                disabled={activatingTrial}
                className={cn(studentBtnPrimary, "whitespace-nowrap flex items-center gap-2 disabled:opacity-60")}
              >
                {activatingTrial ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    جاري التفعيل…
                  </>
                ) : "ابدأ التجربة المجانية"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Post-activation success */}
      {trialActivated && (
        <div className="mx-auto max-w-2xl px-4 pt-6">
          <section className="rounded-2xl border border-success/40 bg-success/10 p-5 text-center">
            <p className="font-black text-success text-lg">🎉 تم تفعيل التجربة!</p>
            <p className={cn("text-sm mt-1", studentMuted)}>
              عندك 30 يوم وصول كامل لغرف المذاكرة
            </p>
            <Link
              href="/student/study-rooms"
              className={cn(studentBtnPrimary, "mt-3 inline-flex")}
            >
              اذهب لغرف المذاكرة
            </Link>
          </section>
        </div>
      )}

      <StudentSubscriptionView
        plans={plans}
        subscription={me?.subscription || null}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        purchasing={purchasing}
        error={error}
        showSubscriptionCta={Boolean(me?.show_subscription_cta)}
        searchParams={searchParams}
        onPurchase={handlePurchase}
        paymentProvider={paymentProvider}
        onPaymentProviderChange={setPaymentProvider}
        checkoutResult={checkoutResult}
        selectedPlanAmount={selectedPlanAmount}
      />
    </div>
  );
}

export default function StudentSubscriptionRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudentSubscriptionContent />
    </Suspense>
  );
}
