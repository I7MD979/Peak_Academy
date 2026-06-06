import { landingPricingPlans } from "@/lib/landing-content";

/** خطط افتراضية عند تعذّر تحميل الـ API */
export const landingPricingPlansFallback = landingPricingPlans.map((plan) => ({
  id: plan.id,
  label: plan.name,
  name: plan.name,
  price: plan.price,
  priceIsText: Boolean(plan.priceIsText),
  priceSuffix: plan.priceSuffix || null,
  period: plan.period,
  featured: Boolean(plan.featured),
  featuredLabel: plan.featuredLabel || null,
  features: plan.features || [],
  cta: plan.cta,
  href: plan.href || "/auth/register",
  variant: plan.variant || "outline"
}));
