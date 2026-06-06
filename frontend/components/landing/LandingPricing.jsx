import Link from "next/link";
import LandingWaveDivider from "@/components/landing/LandingWaveDivider";
import { resolveLandingPlans } from "@/lib/landing-api";

export default function LandingPricing({ plans }) {
  const displayPlans = resolveLandingPlans(plans);

  return (
    <>
      <LandingWaveDivider fill="white" />
      <section id="pricing" className="scroll-reveal overflow-visible landing-section-light landing-pattern-dots landing-section-y">
        <div className="landing-container relative z-10">
          <div className="landing-section-head">
            <span className="landing-section-tag-light mb-4 inline-block sm:mb-5">الأسعار</span>
            <h2 className="landing-h2 text-landing-ink">
              <span className="landing-title-mark ml-2 sm:ml-3">▲</span>
              استثمارك في مستقبلك
            </h2>
            <p className="landing-lead text-landing-ink-muted">اختر الباقة التي تناسب تطلعاتك التعليمية</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 pt-6 sm:grid-cols-2 sm:gap-7 sm:pt-8 xl:grid-cols-4">
            {displayPlans.map((plan) => (
              <div
                key={plan.id || plan.label}
                className={`relative flex h-full flex-col overflow-visible rounded-3xl p-6 transition-all duration-500 sm:p-7 md:p-8 ${
                  plan.featured
                    ? "landing-card-accent-top border-2 border-landing-orange bg-white pt-10 shadow-[0_24px_60px_-16px_rgba(245,114,26,0.28)] xl:scale-[1.03]"
                    : "landing-card-light landing-card-accent-top border-2 border-landing-ink/12 hover:-translate-y-1 hover:border-landing-ink/22 hover:shadow-[0_20px_50px_-14px_rgba(10,18,32,0.16)]"
                }`}
              >
                {plan.featured && plan.featuredLabel ? (
                  <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-amber-300 bg-gradient-to-r from-landing-orange via-amber-500 to-landing-orange px-5 py-2 text-xs font-black tracking-tight text-white shadow-[0_8px_28px_-6px_rgba(245,114,26,0.65)] sm:text-sm">
                    {plan.featuredLabel}
                  </div>
                ) : null}

                <div
                  className={`mb-4 text-xs font-semibold uppercase tracking-widest sm:mb-5 ${
                    plan.featured ? "text-landing-orange" : "text-landing-ink-muted"
                  }`}
                >
                  {plan.label}
                </div>

                <div className="mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-landing-ink sm:mb-8">
                  <span className="text-3xl font-black sm:text-4xl">
                    {plan.price}
                    {plan.priceSuffix ? ` ${plan.priceSuffix}` : ""}
                  </span>
                  <span className="text-sm font-bold text-landing-ink-muted">{plan.period}</span>
                </div>

                <ul className="mb-8 flex-grow space-y-3 sm:mb-10 sm:space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm font-medium text-landing-ink-muted">
                      <span className="mt-0.5 shrink-0 font-bold text-landing-orange">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full rounded-2xl py-3.5 text-center text-sm font-bold transition-all sm:py-4 ${
                    plan.featured
                      ? "bg-landing-orange text-white shadow-[0_10px_40px_-10px_rgba(245,114,26,0.35)] hover:scale-[1.02]"
                      : "border border-landing-ink/12 bg-white text-landing-ink hover:border-landing-navy hover:bg-landing-navy hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
