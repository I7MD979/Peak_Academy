"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import StudentSubscriptionView from "@/components/student/StudentSubscriptionPage";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import { subscriptionsApi } from "@/lib/api";
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

    const txId = sessionStorage.getItem(SUBSCRIPTION_TX_STORAGE_KEY);
    if (!txId) {
      load();
      return;
    }

    let active = true;
    (async () => {
      await pollTransactionFulfillment(txId, { kind: "subscription" });
      sessionStorage.removeItem(SUBSCRIPTION_TX_STORAGE_KEY);
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
        const res = await subscriptionsApi.purchase(planId, promoCode.trim() || undefined);
        const url = res?.data?.checkout_url;
        if (url) {
          if (res?.data?.transaction_id) {
            sessionStorage.setItem(SUBSCRIPTION_TX_STORAGE_KEY, res.data.transaction_id);
          }
          window.location.href = url;
        }
      } catch (err) {
        setError(err.message || "تعذر بدء الدفع");
      } finally {
        setPurchasing(null);
      }
    },
    [promoCode]
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
