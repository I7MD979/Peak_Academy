import Link from "next/link";
import LandingWaveDivider from "@/components/landing/LandingWaveDivider";
import { landingPricingGridClass, resolveLandingPlans } from "@/lib/landing-api";

function PlanIcon({ featured }) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
        featured
          ? "bg-gradient-to-br from-landing-orange to-amber-500 text-white shadow-[0_8px_24px_-6px_rgba(245,114,26,0.45)]"
          : "bg-landing-navy/5 text-landing-navy"
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{featured ? "workspace_premium" : "school"}</span>
    </span>
  );
}

function PricingCard({ plan }) {
  const featured = Boolean(plan.featured);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-visible rounded-[1.75rem] transition-all duration-300 ${
        featured
          ? "z-10 border-2 border-landing-orange bg-white p-6 shadow-[0_28px_64px_-20px_rgba(245,114,26,0.35)] sm:p-7 md:-translate-y-1 md:scale-[1.03] md:p-8"
          : "border border-landing-ink/[0.08] bg-white/90 p-6 shadow-[0_12px_40px_-16px_rgba(10,18,32,0.12)] backdrop-blur-sm hover:-translate-y-1 hover:border-landing-navy/15 hover:shadow-[0_20px_48px_-14px_rgba(10,18,32,0.18)] sm:p-7 md:p-8"
      }`}
    >
      {featured && plan.featuredLabel ? (
        <div className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-landing-orange via-amber-500 to-landing-orange px-4 py-1.5 text-[11px] font-black tracking-wide text-white shadow-[0_6px_20px_-4px_rgba(245,114,26,0.55)] sm:text-xs">
          {plan.featuredLabel}
        </div>
      ) : null}

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-[0.12em] ${
              featured ? "text-landing-orange" : "text-landing-ink-muted"
            }`}
          >
            {plan.label}
          </p>
          {plan.sessionsCount ? (
            <span className="mt-2 inline-flex rounded-full bg-landing-navy/[0.06] px-2.5 py-1 text-[11px] font-bold text-landing-navy">
              {plan.sessionsCount.toLocaleString("ar-EG")} حصص / شهر
            </span>
          ) : null}
        </div>
        <PlanIcon featured={featured} />
      </div>

      <div
        className={`mb-6 rounded-2xl px-4 py-4 sm:mb-7 ${
          featured ? "bg-gradient-to-br from-landing-orange/[0.08] to-amber-500/[0.06]" : "bg-landing-navy/[0.03]"
        }`}
      >
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-4xl font-black leading-none text-landing-ink sm:text-[2.75rem]">
            {plan.price}
          </span>
          {plan.priceSuffix ? (
            <span className="pb-1 text-sm font-bold text-landing-ink-muted">{plan.priceSuffix}</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-landing-ink-muted">{plan.period}</p>
        {plan.perSessionLabel ? (
          <p className="mt-1 text-xs font-bold text-landing-orange">{plan.perSessionLabel}</p>
        ) : null}
      </div>

      {plan.description ? (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-landing-ink-muted">{plan.description}</p>
      ) : null}

      <ul className="mb-8 flex-grow space-y-3 border-t border-landing-ink/[0.06] pt-5 sm:mb-9">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-landing-ink-muted">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                featured ? "bg-landing-orange/15 text-landing-orange" : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              ✓
            </span>
            <span className="font-medium leading-snug">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={`mt-auto block w-full rounded-2xl py-3.5 text-center text-sm font-black transition-all sm:py-4 ${
          featured
            ? "bg-gradient-to-r from-landing-orange to-amber-500 text-white shadow-[0_12px_32px_-8px_rgba(245,114,26,0.5)] hover:brightness-105"
            : "border-2 border-landing-navy/10 bg-white text-landing-navy hover:border-landing-navy hover:bg-landing-navy hover:text-white"
        }`}
      >
        {plan.cta}
      </Link>
    </article>
  );
}

export default function LandingPricing({ plans }) {
  const displayPlans = resolveLandingPlans(plans);
  const gridClass = landingPricingGridClass(displayPlans.length);

  return (
    <>
      <LandingWaveDivider fill="white" />
      <section
        id="pricing"
        className="scroll-reveal landing-section-y overflow-visible bg-gradient-to-b from-white via-[#fafbfd] to-[#f0f3f8] landing-pattern-dots"
      >
        <div className="landing-container relative z-10">
          <div className="landing-section-head">
            <span className="landing-section-tag-light mb-4 inline-block sm:mb-5">الأسعار</span>
            <h2 className="landing-h2 text-landing-ink">
              <span className="landing-title-mark ml-2 sm:ml-3">▲</span>
              استثمارك في مستقبلك
            </h2>
            <p className="landing-lead text-landing-ink-muted">
              باقات شهرية مرنة — كلما زادت حصصك، وفّرت أكثر
            </p>
          </div>

          <div className={`grid items-stretch gap-6 pt-2 sm:gap-7 sm:pt-4 ${gridClass}`}>
            {displayPlans.map((plan) => (
              <PricingCard key={plan.id || plan.label} plan={plan} />
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed text-landing-ink-muted/80 sm:mt-10">
            الأسعار تشمل الوصول لجميع المواد والمعلمين. يمكنك الترقية أو الإلغاء من لوحة الطالب.
          </p>
        </div>
      </section>
    </>
  );
}
