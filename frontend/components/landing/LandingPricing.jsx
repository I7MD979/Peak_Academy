"use client";

import Icon from "@/components/shared/Icon";
import { Button } from "@/components/ui/button";
import LandingReveal from "@/components/landing/LandingReveal";
import LandingSectionHeader from "@/components/landing/LandingSectionHeader";
import StatValue from "@/components/landing/StatValue";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function getPlanHref(plan, isLoggedIn) {
  if (plan.priceIsText) return "/auth/register";
  const planId = encodeURIComponent(plan.id);
  if (isLoggedIn) {
    return `/student/subscription?plan=${planId}&autostart=1`;
  }
  const redirect = encodeURIComponent("/student/subscription");
  return `/auth/register?plan=${planId}&redirect=${redirect}`;
}

export default function LandingPricing({ plans }) {
  const items = plans || [];
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  return (
    <section
      id="pricing"
      className="landing-section scroll-mt-20 bg-white px-4 md:px-8"
      aria-labelledby="pricing-heading"
    >
      <LandingSectionHeader
        theme="light"
        tag="الأسعار"
        title="اختر الطريقة المناسبة ليك"
        subtitle="ابدأ مجاناً، ادفع لكل حصة، أو وفّر مع الاشتراك الشهري — بدون مفاجآت."
        align="center"
      />

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((plan, index) => (
          <LandingReveal key={plan.id} delay={index * 70} className="h-full">
            <article
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md md:p-6",
                plan.featured
                  ? "border-accent/40 shadow-lg shadow-accent/10 ring-2 ring-accent/20"
                  : "border-border"
              )}
            >
              {plan.featuredLabel ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-md">
                  {plan.featuredLabel}
                </span>
              ) : null}

              <h3 id={index === 0 ? "pricing-heading" : undefined} className="text-lg font-bold text-primary">
                {plan.name}
              </h3>

              <div className="mt-4 flex flex-wrap items-end gap-1">
                {plan.priceIsText ? (
                  <span className="text-3xl font-black text-accent">{plan.price}</span>
                ) : (
                  <>
                    <StatValue className="text-4xl font-black text-accent">{plan.price}</StatValue>
                    {plan.priceSuffix ? (
                      <span className="mb-1 text-sm font-semibold text-text-muted">{plan.priceSuffix}</span>
                    ) : null}
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">{plan.period}</p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-text">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="check" size={16} className="mt-0.5 shrink-0 text-success" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                href={getPlanHref(plan, isLoggedIn)}
                variant={plan.variant === "primary" ? "accent" : "outline"}
                className="mt-6 w-full"
              >
                {plan.cta}
              </Button>
            </article>
          </LandingReveal>
        ))}
      </div>
    </section>
  );
}
