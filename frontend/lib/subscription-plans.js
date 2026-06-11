const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

const SESSION_FEATURE_RE = /حصص/i;

export function toArabicNumeral(value) {
  return String(value)
    .split("")
    .map((char) => (char >= "0" && char <= "9" ? ARABIC_DIGITS[Number(char)] : char))
    .join("");
}

function sessionsFeatureLine(sessions) {
  return `${toArabicNumeral(sessions)} حصص كل شهر`;
}

function defaultFeaturesForSessions(sessions) {
  const count = sessionsFeatureLine(sessions);

  if (sessions <= 4) {
    return [count, "جميع المواد والمعلمين", "أولوية الحجز", "تقارير أسبوعية"];
  }

  if (sessions <= 8) {
    return [
      count,
      "جميع المواد والمعلمين",
      "أولوية الحجز المتقدم",
      "تقارير أسبوعية + تحليل",
      "دعم أولوية"
    ];
  }

  return [
    count,
    "جميع المواد والمعلمين",
    "أولوية الحجز المتقدم",
    "تقارير أسبوعية + تحليل",
    "خصم على الحصص الإضافية",
    "دعم أولوية"
  ];
}

function isSessionCountFeature(feature) {
  return SESSION_FEATURE_RE.test(String(feature || ""));
}

/** Keep plan features aligned with sessions_per_month for landing and checkout UI. */
export function normalizeSubscriptionPlanFeatures(plan) {
  const sessions = Number(plan?.sessions_per_month) || 0;
  if (!sessions) return Array.isArray(plan?.features) ? plan.features : [];

  const raw = Array.isArray(plan?.features) ? plan.features.filter(Boolean) : [];
  if (!raw.length) return defaultFeaturesForSessions(sessions);

  const expectedFirst = sessionsFeatureLine(sessions);
  const features = [...raw];

  if (isSessionCountFeature(features[0])) {
    features[0] = expectedFirst;
    return features;
  }

  return [expectedFirst, ...features];
}

export function normalizeSubscriptionPlan(plan) {
  if (!plan) return plan;
  return {
    ...plan,
    features: normalizeSubscriptionPlanFeatures(plan)
  };
}

export function normalizeSubscriptionPlans(plans) {
  return (plans || []).map(normalizeSubscriptionPlan);
}
