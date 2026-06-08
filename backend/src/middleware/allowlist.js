/**
 * Mass Assignment Protection — Allowlist Middleware
 * OWASP API3:2023 — Broken Object Property Level Authorization
 */

export function allowFields(...fields) {
  const allowed = new Set(fields);
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      const filtered = {};
      for (const field of allowed) {
        if (field in req.body) filtered[field] = req.body[field];
      }
      req.body = filtered;
    }
    next();
  };
}

export function denyFields(...fields) {
  const denied = new Set(fields);
  return (req, _res, next) => {
    if (req.body && typeof req.body === "object") {
      for (const field of denied) {
        delete req.body[field];
      }
    }
    next();
  };
}

const SCHEMAS = {
  userProfile: [
    "full_name",
    "phone",
    "bio",
    "avatar_url",
    "subjects",
    "grades",
    "experience_years",
    "education",
    "social_url",
    "grade",
    "section"
  ],
  sessionCreate: [
    "title",
    "subject",
    "grade",
    "school_level",
    "scheduled_at",
    "duration_min",
    "max_students",
    "price_per_student",
    "description",
    "subject_id",
    "start_time",
    "price"
  ],
  enrollSession: ["payment_id", "payment_type", "promo_code"],
  paymentInitiate: ["amount", "session_id", "type", "subject", "content", "grade", "promo_code"],
  paymentCreateOrder: [
    "provider",
    "planId",
    "subscriptionId",
    "enrollmentId",
    "amount",
    "amount_egp",
    "promotionId",
    "metadata"
  ],
  subscriptionPurchase: ["plan_id", "promo_code"],
  instapayReceipt: ["paymentId", "referenceCode", "image_base64", "content_type"],
  adminPlanCreate: [
    "name",
    "price",
    "sessions_per_month",
    "features",
    "description",
    "featured_label",
    "sort_order",
    "is_active",
    "is_featured"
  ],
  adminWithdrawalUpdate: ["status", "reason"]
};

export function allowSchema(schemaName) {
  const fields = SCHEMAS[schemaName];
  if (!fields) throw new Error(`Unknown schema: ${schemaName}`);
  return allowFields(...fields);
}
