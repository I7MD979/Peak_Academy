"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import StudentSubscriptionView from "@/components/student/StudentSubscriptionPage";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import { paymentsApi, subscriptionsApi, newIdempotencyKey } from "@/lib/api";
import { pollTransactionFulfillment } from "@/lib/paymob";
import {
  findAutostartPlan,
  SUBSCRIPTION_TX_STORAGE_KEY
} from "@/lib/student-subscription";

function StudentSubscriptionContent() {
  const searchParams = useSearchParams();
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

    const txId = searchParams.get("txId") || sessionStorage.getItem(SUBSCRIPTION_TX_STORAGE_KEY);
    if (txId) sessionStorage.removeItem(SUBSCRIPTION_TX_STORAGE_KEY);
    if (!txId) {
      load();
      return;
    }

    let active = true;
    (async () => {
      try {
        const statusRes = await paymentsApi.orderStatus(txId);
        if (statusRes?.data?.subscription_activated || statusRes?.data?.paid) {
          if (active) await load();
          return;
        }
      } catch {
        /* fall back to legacy poll */
      }
      await pollTransactionFulfillment(txId, { kind: "subscription" });
      if (active) await load();
    })();

    return () => {
      active = false;
    };
  }, [load, searchParams]);

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
          const txParam = data.paymentId ? `txId=${data.paymentId}` : "";
          const sep = (data.paymentUrl || data.iframeUrl || "").includes("?") ? "&" : "?";
          window.location.href = txParam
            ? `${data.paymentUrl || data.iframeUrl}${sep}${txParam}`
            : (data.paymentUrl || data.iframeUrl);
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

  return (
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
  );
}

export default function StudentSubscriptionRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudentSubscriptionContent />
    </Suspense>
  );
}
