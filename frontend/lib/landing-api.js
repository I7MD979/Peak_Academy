import { getApiBaseUrl } from "@/lib/api-base";
import { landingHeroCountersFallback } from "@/lib/landing-constants";
import { landingPricingPlansFallback } from "@/lib/landing-content-fallback";
import { normalizeSubscriptionPlanFeatures } from "@/lib/subscription-plans";

const RAILWAY_API = "https://peakacademy-production.up.railway.app/api";

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
    const resolvedBase = baseUrl.includes("localhost") ? RAILWAY_API : baseUrl;
    const res = await fetch(`${resolvedBase}/public/landing`, {
      next: { revalidate: 60, tags: ["landing-data"] },
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function validatePublicPromoCode(code, paymentType = "subscription") {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: "أدخل كود الخصم أولاً" };
  }

  try {
    const baseUrl = getApiBaseUrl();
    const resolvedBase = baseUrl.includes("localhost") ? RAILWAY_API : baseUrl;
    const res = await fetch(`${resolvedBase}/public/validate-promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: normalized, payment_type: paymentType })
    });
    const json = await res.json().catch(() => ({}));
    const payload = json?.data ?? json;
    return {
      valid: Boolean(payload?.valid),
      message: payload?.message || json?.message || "تعذر التحقق من الكود"
    };
  } catch {
    return { valid: false, message: "تعذر التحقق من الكود حالياً" };
  }
}

export function mapPlansToLanding(plans) {
  if (!plans?.length) return null;
  return plans.map((plan) => {
    const sessions = Number(plan.sessions_per_month) || 0;
    const features = normalizeSubscriptionPlanFeatures(plan);

    return {
      id: plan.id,
      label: plan.name_ar || plan.name,
      name: plan.name_ar || plan.name,
      price:
        plan.price === 0 || Number(plan.price) === 0
          ? "مجاناً"
          : Number(plan.price).toLocaleString("ar-EG"),
      priceNumeric: Number(plan.price) || 0,
      priceIsText: plan.price === 0 || Number(plan.price) === 0,
      priceSuffix: Number(plan.price) > 0 ? "جنيه" : null,
      sessionsCount: sessions,
      perSessionLabel:
        sessions > 0 && Number(plan.price) > 0
          ? `${Math.round(Number(plan.price) / sessions).toLocaleString("ar-EG")} جنيه للحصة`
          : null,
      period: sessions ? `/ شهر — ${sessions} حصص` : "الحصة الواحدة",
      description: plan.description || null,
      featured: Boolean(plan.is_featured),
      featuredLabel: plan.featured_label || "الأكثر طلباً",
      features,
      cta: sessions > 0 ? `اشترك في ${plan.name_ar || plan.name}` : "اشترك الآن",
      href: safePlanRegisterHref(plan.id),
      variant: plan.is_featured ? "primary" : "outline"
    };
  });
}

export function resolveLandingPlans(plans) {
  const mapped = mapPlansToLanding(plans);
  if (mapped?.length) return mapped;
  return landingPricingPlansFallback;
}

/** Responsive grid for N pricing cards (centered, no empty columns). */
export function landingPricingGridClass(count = 1) {
  if (count <= 1) return "mx-auto max-w-sm grid-cols-1";
  if (count === 2) return "mx-auto max-w-3xl grid-cols-1 sm:grid-cols-2";
  if (count === 3) return "mx-auto max-w-5xl grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
}

const GROUP_SIZE_STAT_PATTERN = /8\s*طلاب|مجموعات?\s*صغ|حد\s*أقصى.*طل/i;

const QUICK_STAT_ICON_BY_KEY = {
  dashboards: "groups",
  teachers: "schedule",
  sessions_monthly: "live_tv",
  pricing_starts: "payments"
};

export function mapStatsToQuickCards(stats) {
  if (!Array.isArray(stats) || !stats.length) return null;
  const icons = ["groups", "schedule", "live_tv", "payments"];
  const filtered = stats.filter((row) => {
    const text = `${row.label || ""} ${row.hint || ""} ${row.value || ""}`;
    return !GROUP_SIZE_STAT_PATTERN.test(text);
  });
  if (!filtered.length) return null;
  return filtered.slice(0, 4).map((row, index) => ({
    icon: row.icon || QUICK_STAT_ICON_BY_KEY[row.key] || icons[index] || "star",
    title: row.label || row.key || "—",
    sub: row.hint || ""
  }));
}

export function resolveQuickStats(stats, fallback) {
  const mapped = mapStatsToQuickCards(stats);
  const base = mapped?.length ? mapped : [];
  if (base.length >= 4) return base.slice(0, 4);

  const usedTitles = new Set(base.map((item) => item.title));
  const extras = fallback.filter((item) => !usedTitles.has(item.title));
  const merged = [...base, ...extras];

  return merged.length ? merged.slice(0, 4) : fallback;
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
  if (first?.label) return first.label;
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
