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
            label: "المحاضرات",
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
        <section className={cn(studentCardSolid, "border-dashed border-md-primary/25 p-5")}>
          <p className="font-bold text-auth-on-surface">اختر باقتك الشهرية</p>
          <p className={cn("mt-1 text-sm", studentMuted)}>
            كلما زاد عدد الحصص، انخفض سعر الحصة الواحدة.
          </p>
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

      <div
        className={cn(
          "grid gap-5",
          plans.length === 1 && "mx-auto max-w-md grid-cols-1",
          plans.length === 2 && "mx-auto max-w-3xl grid-cols-1 md:grid-cols-2",
          plans.length === 3 && "mx-auto max-w-5xl grid-cols-1 md:grid-cols-3",
          plans.length >= 4 && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {plans.map((plan) => {
          const highlighted = isPlanHighlighted(plan, searchParams) || plan.is_featured;
          const features = normalizeSubscriptionPlanFeatures(plan);
          const sessions = Number(plan.sessions_per_month) || 0;
          const priceNum = Number(plan.price) || 0;
          const perSession =
            sessions > 0 && priceNum > 0
              ? `${Math.round(priceNum / sessions).toLocaleString("ar-EG")} جنيه للحصة`
              : null;

          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-all sm:p-6",
                highlighted
                  ? "border-peak-orange/40 bg-gradient-to-b from-peak-orange/[0.06] to-surface-container-low shadow-[0_16px_40px_-12px_rgba(245,114,26,0.25)] ring-2 ring-peak-orange/20"
                  : "border-outline-variant/60 bg-surface-container-low hover:border-md-primary/30 hover:shadow-md"
              )}
            >
              {(plan.featured_label || plan.is_featured) && highlighted ? (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-xl bg-peak-orange px-3 py-1 text-[10px] font-black text-white">
                  {plan.featured_label || "الأكثر طلباً"}
                </span>
              ) : null}

              <div className="mb-4 flex items-start justify-between gap-3 pt-1">
                <div>
                  <h2 className="text-lg font-black text-auth-on-surface">{plan.name}</h2>
                  {sessions > 0 ? (
                    <span className="mt-1.5 inline-flex rounded-full bg-md-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-md-primary">
                      {sessions.toLocaleString("ar-EG")} حصص / شهر
                    </span>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    highlighted ? "bg-peak-orange/15 text-peak-orange" : "bg-surface-container-highest text-md-primary"
                  )}
                >
                  <Icon name={highlighted ? "workspace_premium" : "payments"} size={22} />
                </span>
              </div>

              <div
                className={cn(
                  "mb-4 rounded-xl px-4 py-3",
                  highlighted ? "bg-peak-orange/10" : "bg-surface-container-highest/80"
                )}
              >
                <p className="text-3xl font-black text-auth-on-surface">{formatCurrencyEgp(plan.price)}</p>
                {perSession ? (
                  <p className="mt-1 text-xs font-bold text-peak-orange">{perSession}</p>
                ) : null}
              </div>

              {plan.description ? (
                <p className={cn("mb-3 text-sm leading-relaxed", studentMuted)}>{plan.description}</p>
              ) : null}

              {features.length > 0 ? (
                <ul className="mb-5 flex-grow space-y-2 border-t border-outline-variant/40 pt-4 text-sm text-auth-on-surface">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mb-5 flex-grow" />
              )}

              <button
                type="button"
                className={cn(
                  studentBtnPrimary,
                  "mt-auto w-full justify-center",
                  highlighted && "shadow-[0_8px_24px_-8px_rgba(245,114,26,0.45)]"
                )}
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
