"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import Icon from "@/components/shared/Icon";
import { subscriptionsApi } from "@/lib/api";
import { formatCurrencyEgp } from "@/lib/format";

const PLAN_COPY = {
  silver: { label: "Silver", sessions: 4 },
  gold: { label: "Gold", sessions: 10 }
};

export default function StudentSubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [me, setMe] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState("");

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
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      load();
    }
  }, [load]);

  const handlePurchase = async (planId) => {
    try {
      setPurchasing(planId);
      setError("");
      const res = await subscriptionsApi.purchase(planId, promoCode.trim() || undefined);
      const url = res?.data?.checkout_url;
      if (url) {
        if (res?.data?.transaction_id) {
          sessionStorage.setItem("peak-sub-tx", res.data.transaction_id);
        }
        window.location.href = url;
      }
    } catch (err) {
      setError(err.message || "تعذر بدء الدفع");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const sub = me?.subscription;

  return (
    <main className="space-y-6 bg-bg p-4 md:p-6">
      <Link href="/student/sessions" className="inline-flex items-center gap-1 text-sm font-bold text-accent">
        <Icon name="arrowRight" size={16} />
        العودة للجلسات
      </Link>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-2xl font-black text-text">الاشتراك الشهري</h1>
        {sub ? (
          <div className="mt-4 rounded-xl bg-success/10 p-4">
            <p className="font-bold text-success">
              خطتك: {sub.plan?.name || "نشط"} — {sub.sessions_remaining} حصة متبقية
            </p>
            <p className="mt-1 text-sm text-text-muted">
              ينتهي الدور الحالي:{" "}
              {sub.current_period_end
                ? new Date(sub.current_period_end).toLocaleDateString("ar-EG")
                : "—"}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-text-muted">لا يوجد اشتراك نشط. اختر خطة أدناه.</p>
        )}
      </section>

      <div>
        <label className="text-xs font-bold text-text-muted">كود خصم (اختياري)</label>
        <input
          type="text"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-xl border border-border bg-card px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const copy = PLAN_COPY[plan.name] || { label: plan.name, sessions: plan.sessions_per_month };
          return (
            <article key={plan.id} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-xl font-black text-accent">{copy.label}</h2>
              <p className="mt-1 text-3xl font-black text-text">{formatCurrencyEgp(plan.price)}</p>
              <p className="mt-2 text-sm text-text-muted">{copy.sessions} حصص / شهر</p>
              <Button
                className="mt-4 w-full rounded-xl"
                variant="accent"
                disabled={Boolean(purchasing)}
                onClick={() => handlePurchase(plan.id)}
              >
                {purchasing === plan.id ? "جارٍ التحويل..." : "اشترك الآن"}
              </Button>
            </article>
          );
        })}
      </div>

      {me?.show_subscription_cta ? (
        <p className="text-sm text-text-muted">
          لاحظت أنك حضرت عدة حصص مدفوعة — الاشتراك يوفر عليك مقارنة بالدفع لكل حصة.
        </p>
      ) : null}
    </main>
  );
}
