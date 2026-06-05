import { getApiBaseUrl } from "@/lib/api-base";

export async function getLandingData() {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/public/landing`, {
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function mapPlansToLanding(plans) {
  if (!plans?.length) return null;
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price === 0 || Number(plan.price) === 0 ? "مجاناً" : String(plan.price),
    priceIsText: plan.price === 0 || Number(plan.price) === 0,
    priceSuffix: Number(plan.price) > 0 ? "جنيه" : null,
    period: plan.sessions_per_month
      ? `/ شهر — ${plan.sessions_per_month} حصص`
      : "الحصة الواحدة",
    featured: Boolean(plan.is_featured),
    featuredLabel: plan.featured_label || null,
    features: plan.features || [],
    cta: plan.is_featured ? `اشترك في ${plan.name}` : "اشترك الآن",
    href: "/auth/register",
    variant: plan.is_featured ? "primary" : "outline"
  }));
}
