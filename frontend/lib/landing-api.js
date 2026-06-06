import { getApiBaseUrl } from "@/lib/api-base";
import { landingHeroCountersFallback } from "@/lib/landing-constants";
import { landingPricingPlansFallback } from "@/lib/landing-content-fallback";

const PLAN_ID_RE = /^[0-9a-f-]{36}$/i;

function safePlanRegisterHref(planId) {
  if (!planId) return "/auth/register";
  const id = String(planId).trim();
  if (!PLAN_ID_RE.test(id) && !/^\d+$/.test(id)) return "/auth/register";
  const redirect = encodeURIComponent("/student/subscription");
  return `/auth/register?redirect=${redirect}&plan=${encodeURIComponent(id)}`;
}

export async function getLandingData() {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/public/landing`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export function mapPlansToLanding(plans) {
  if (!plans?.length) return null;
  return plans.map((plan) => ({
    id: plan.id,
    label: plan.name,
    name: plan.name,
    price:
      plan.price === 0 || Number(plan.price) === 0
        ? "مجاناً"
        : Number(plan.price).toLocaleString("ar-EG"),
    priceIsText: plan.price === 0 || Number(plan.price) === 0,
    priceSuffix: Number(plan.price) > 0 ? "جنيه" : null,
    period: plan.sessions_per_month
      ? `/ شهر — ${plan.sessions_per_month} حصص`
      : "الحصة الواحدة",
    featured: Boolean(plan.is_featured),
    featuredLabel: plan.featured_label || "الموصى به",
    features: Array.isArray(plan.features) ? plan.features : [],
    cta: plan.is_featured ? `اشترك في ${plan.name}` : "اشترك الآن",
    href: safePlanRegisterHref(plan.id),
    variant: plan.is_featured ? "primary" : "outline"
  }));
}

export function resolveLandingPlans(plans) {
  const mapped = mapPlansToLanding(plans);
  if (!mapped || mapped.length < 2) return landingPricingPlansFallback;
  return mapped;
}

const GROUP_SIZE_STAT_PATTERN = /8\s*طلاب|مجموعات?\s*صغ|حد\s*أقصى.*طل/i;

export function mapStatsToQuickCards(stats) {
  if (!Array.isArray(stats) || !stats.length) return null;
  const icons = ["groups", "schedule", "menu_book", "payments"];
  const filtered = stats.filter((row) => {
    const text = `${row.label || ""} ${row.hint || ""} ${row.value || ""}`;
    return !GROUP_SIZE_STAT_PATTERN.test(text);
  });
  if (!filtered.length) return null;
  return filtered.slice(0, 4).map((row, index) => ({
    icon: row.icon || icons[index] || "star",
    title: row.label || row.key || "—",
    sub: row.hint || ""
  }));
}

export function mapPromosToRecord(promos) {
  if (!promos?.length) return {};
  return promos.reduce((acc, promo) => {
    if (!promo?.code) return acc;
    const code = String(promo.code).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return acc;
    acc[code] = promo.label || `عرض ${code}`;
    return acc;
  }, {});
}

export function resolveHeroPromoLabel(promos) {
  const first = promos?.[0];
  if (first?.label && first?.code) {
    return `${first.label} — كود ${first.code}`;
  }
  if (first?.code) return `عرض خاص — كود ${first.code}`;
  return "عرض محدود — سجّل الآن وابدأ رحلتك";
}

export function parseHeroCounter(stats, key, fallback) {
  const row = stats?.find((item) => item.key === key);
  if (!row?.value) return fallback;
  const numeric = Number(String(row.value).replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export function resolveHeroCounters(stats) {
  return {
    sessions: parseHeroCounter(
      stats,
      "sessions",
      parseHeroCounter(stats, "sessions_monthly", landingHeroCountersFallback.sessions)
    ),
    teachers: parseHeroCounter(stats, "teachers", landingHeroCountersFallback.teachers),
    rating: parseHeroCounter(stats, "rating", landingHeroCountersFallback.rating)
  };
}
