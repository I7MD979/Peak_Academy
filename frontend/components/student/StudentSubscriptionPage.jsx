"use client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PageContainer from "@/components/shared/PageContainer";
import Icon from "@/components/shared/Icon";
import {
  studentBtnPrimary,
  studentCardSolid,
  studentErrorBox,
  studentInput,
  studentMuted
} from "@/lib/student-styles";
import { formatCurrencyEgp } from "@/lib/format";
import { normalizeSubscriptionPlanFeatures } from "@/lib/subscription-plans";
import { formatSubscriptionPeriodEnd, isPlanHighlighted } from "@/lib/student-subscription";
import { cn } from "@/lib/utils";
import CheckoutPaymentStep from "@/components/payment/CheckoutPaymentStep";
export default function StudentSubscriptionPage({
  plans = [],
  subscription = null,
  promoCode = "",
  onPromoCodeChange,
  purchasing = null,
  error = "",
  showSubscriptionCta = false,
  searchParams = null,
  onPurchase,
  paymentProvider = "instapay",
  paymentAvailability = null,
  onPaymentProviderChange,
  checkoutResult = null,
  selectedPlanAmount = null
}) {
  return (
    <PageContainer>
      <AdminPageHeader
        eyebrow="الاشتراك"
        title="الاشتراك الشهري"
        subtitle={
          subscription
            ? `خطتك: ${subscription.plan?.name || "نشط"} — ${subscription.sessions_remaining} حصة متبقية`
            : "اختر خطة تناسبك ووفّر على الحصص"
        }
        actions={[
          {
            label: "الجلسات",
            icon: "book",
            variant: "secondary",
            href: "/student/sessions"
          }
        ]}
      />

      {subscription ? (
        <section className="rounded-2xl border border-success/40 bg-success/10 p-5 space-y-3">
          <div>
            <p className="font-bold text-success">
              خطتك: {subscription.plan?.name || "نشط"} — {subscription.sessions_remaining} حصة متبقية
            </p>
            <p className={cn("mt-1 text-sm", studentMuted)}>
              ينتهي الدور الحالي: {formatSubscriptionPeriodEnd(subscription.current_period_end)}
            </p>
          </div>
        </section>
      ) : (
        <section className={cn(studentCardSolid, "p-5")}>
          <p className={cn("text-sm", studentMuted)}>لا يوجد اشتراك نشط. اختر خطة أدناه.</p>
        </section>
      )}

      <div>
        <label htmlFor="promo_code" className="text-xs font-bold text-auth-on-surface-variant">
          كود خصم (اختياري)
        </label>
        <input
          id="promo_code"
          type="text"
          value={promoCode}
          onChange={(event) => onPromoCodeChange?.(event.target.value)}
          className={cn(studentInput, "mt-1 max-w-sm")}
        />
      </div>

      {error ? (
        <div className={studentErrorBox}>
          <p className="text-sm font-bold text-danger">{error}</p>
        </div>
      ) : null}

      {!subscription && !checkoutResult ? (
        <section className="space-y-3">
          <p className="text-sm font-bold text-auth-on-surface-variant">طريقة الدفع</p>
          <CheckoutPaymentStep
            selectedProvider={paymentProvider}
            onProviderChange={onPaymentProviderChange}
            providerAvailability={paymentAvailability}
            checkoutResult={null}
          />
        </section>
      ) : null}

      {checkoutResult ? (
        <CheckoutPaymentStep
          selectedProvider={paymentProvider}
          onProviderChange={onPaymentProviderChange}
          providerAvailability={paymentAvailability}
          checkoutResult={checkoutResult}
          amountCents={selectedPlanAmount ? Math.round(selectedPlanAmount * 100) : null}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const highlighted = isPlanHighlighted(plan, searchParams) || plan.is_featured;
          const features = normalizeSubscriptionPlanFeatures(plan);

          return (
            <article
              key={plan.id}
              className={cn(
                studentCardSolid,
                "p-5",
                highlighted && "border-peak-orange/50 ring-2 ring-peak-orange/15"
              )}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-peak-orange">{plan.name}</h2>
                {plan.featured_label || plan.is_featured ? (
                  <span className="rounded-full bg-peak-orange/15 px-2 py-0.5 text-xs font-bold text-peak-orange">
                    {plan.featured_label || "مميز"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-3xl font-black text-auth-on-surface">{formatCurrencyEgp(plan.price)}</p>
              <p className={cn("mt-2 text-sm", studentMuted)}>
                {plan.sessions_per_month} حصص / شهر
              </p>
              {plan.description ? (
                <p className={cn("mt-2 text-sm", studentMuted)}>{plan.description}</p>
              ) : null}
              {features.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm text-auth-on-surface">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Icon name="check" size={14} className="mt-0.5 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                className={cn(studentBtnPrimary, "mt-4 w-full justify-center")}
                disabled={Boolean(purchasing) || Boolean(subscription)}
                onClick={() => onPurchase?.(plan.id)}
              >
                {purchasing === plan.id ? "جارٍ التحويل…" : subscription ? "لديك اشتراك نشط" : "اشترك الآن"}
              </button>
            </article>
          );
        })}
      </div>

      {showSubscriptionCta ? (
        <p className={cn("text-sm", studentMuted)}>
          لاحظت أنك حضرت عدة حصص مدفوعة — الاشتراك يوفر عليك مقارنة بالدفع لكل حصة.
        </p>
      ) : null}
    </PageContainer>
  );
}
