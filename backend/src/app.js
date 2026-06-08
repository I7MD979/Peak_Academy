import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { limiter } from "./middleware/rateLimit.js";
import { timeout } from "./middleware/timeout.js";
import { requestId } from "./middleware/requestId.js";
import { auditLog } from "./middleware/auditLog.js";
import { enforceSameSiteCookies, validateOrigin, generateCsrfToken } from "./middleware/csrf.js";
import { signResponses, responseEnvelope } from "./middleware/responseIntegrity.js";
import {
  blockPathTraversal,
  enforceHttps,
  sanitizeLogging,
  sanitizeInput,
  blockSQLInjection,
  securityHeaders,
  sanitizeErrors,
  securityLogger,
  blockSSRF,
  hppProtection,
  validateInputLengths,
  bodySizeLimit
} from "./middleware/security.js";
import { stripOwnershipFields } from "./middleware/ownership.js";
import { checkPermission } from "./middleware/permissions.js";
import {
  apiVersioning,
  protectDebugEndpoints,
  requireJsonContentType,
  createApiManifestHandler
} from "./middleware/apiInventory.js";
import { auth } from "./middleware/auth.js";
import { checkRole } from "./middleware/checkRole.js";

import authRoutes from "./routes/auth.js";
import googleAuthRoutes from "./routes/google-auth.js";
import sessionRoutes from "./routes/sessions.js";
import paymentRoutes from "./routes/payments.js";
import webhooksRoutes from "./routes/webhooks.js";
import earningRoutes from "./routes/earnings.js";
import questionRoutes from "./routes/questions.js";
import parentRoutes from "./routes/parent.js";
import adminRoutes from "./routes/admin.js";
import adminPromotionsRoutes from "./routes/adminPromotions.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import notificationRoutes from "./routes/notifications.js";
import featureFlagsRoutes from "./routes/featureFlags.js";
import onboardingRoutes from "./routes/onboarding.js";
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";
import studyRoomsRoutes from "./routes/studyRooms.js";
import enrollmentRoutes from "./routes/enrollments.js";
import promotionRoutes from "./routes/promotions.js";
import publicRoutes from "./routes/public.js";
import { captureException, setupExpressSentry } from "./lib/sentry.js";

const app = express();

app.use(cookieParser());

function getAllowedOrigins() {
  const origins = new Set();
  const primary = (process.env.FRONTEND_URL || "http://localhost:3000").trim();
  if (primary) origins.add(primary.replace(/\/$/, ""));

  const extra = process.env.ALLOWED_ORIGINS || "";
  extra
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((value) => origins.add(value));

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

const allowedOrigins = getAllowedOrigins();

app.use(requestId);
app.use(responseEnvelope);
app.use(signResponses);

// ── Layer 1: Transport Security ──────────
app.use(enforceHttps);

// ── Layer 2: Security Headers (OWASP A05, NIST SC-8) ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          // Hash for OAuth form auto-submit script
          "'sha256-CNpGs301fn1abxhLSmcOuQ1govWG+iiQizQpEPLwBd4='",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://api.paymob.com", "https://api.peak-academy.net"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        formAction: [
          "'self'",
          "https://peak-academy-kappa.vercel.app",
          "https://peak-academy.net",
          "https://www.peak-academy.net",
          ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
        ],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true
  })
);
app.use(securityHeaders);

// ── Layer 3: CORS ──────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Idempotency-Key",
      "X-CSRF-Token",
      "x-csrf-token"
    ],
    maxAge: 86400
  })
);

// ── Layer 3b: CSRF & Origin ──────────────
app.use(enforceSameSiteCookies);
app.use(validateOrigin([...allowedOrigins]));

// ── Layer 3c: API Inventory (OWASP API9) ─
app.use(apiVersioning);
app.use(protectDebugEndpoints);

// ── Layer 4: Body Parsing ──────────────────
// Larger limits for routes that need binary/base64 payloads
app.use(["/api/auth/avatar", "/auth/avatar"], express.json({ limit: "3mb" }));
app.use(["/api/payments/webhook", "/payments/webhook"], express.json({ limit: "512kb" }));
app.use(express.json({ limit: bodySizeLimit }));
app.use(express.urlencoded({ extended: false, limit: bodySizeLimit }));
app.use(requireJsonContentType);

// ── Layer 5: Security Middleware (OWASP A03, CWE-20) ──
app.use(blockPathTraversal);
app.use(blockSQLInjection);
app.use(sanitizeInput);
app.use(hppProtection);
app.use(validateInputLengths);
app.use(blockSSRF);
app.use(sanitizeLogging);
app.use(stripOwnershipFields);

// ── Layer 6: Rate Limiting (OWASP A07) ────
app.use(timeout);
app.use(["/api", "/auth"], limiter);

// ── Layer 8: Audit Logging (NIST AU-2) ────
app.use(auditLog);

// ── Layer 9: Monitoring (NIST AU-2) ───────
app.use(securityLogger);

export const API_VERSION = "2026-06-09-schema-v2";

app.use("/api", (_req, res, next) => {
  res.setHeader("X-Peak-Api-Version", API_VERSION);
  next();
});

function getSupabaseProjectRef() {
  const url = process.env.SUPABASE_URL || "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || null;
}

app.get("/api/auth/csrf-token", generateCsrfToken);
app.get("/api/admin/api-manifest", auth, checkRole("admin"), createApiManifestHandler(app));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
    api_version: API_VERSION,
    sessions_query: "plain-select",
    supabase_project_ref: getSupabaseProjectRef()
  });
});

app.get("/api/diag", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { resolveAuthUserFromToken } = await import("./middleware/auth.js");
    const resolved = await resolveAuthUserFromToken(authHeader.slice(7).trim());
    if (!resolved || resolved.user?.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin only" });
    }
  }

  const { supabase } = await import("./lib/supabase.js");
  const { getCacheMode } = await import("./lib/cache.js");
  const tables = [
    "users",
    "sessions",
    "session_enrollments",
    "enrollments",
    "payments",
    "parent_children",
    "performance_reports",
    "withdrawal_requests",
    "teacher_profiles",
    "subscription_plans",
    "student_subscriptions",
    "promotions",
    "free_trial_uses",
    "referral_codes",
    "notifications",
    "question_pricing",
    "questions",
    "study_rooms",
    "study_room_members"
  ];
  const checks = {};

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    checks[table] = error ? { ok: false, code: error.code, message: error.message } : { ok: true };
  }

  const needsSql = Object.values(checks).some((c) => !c.ok);
  const payload = {
    success: true,
    api_version: API_VERSION,
    cache_mode: getCacheMode(),
    tables: checks,
    action: needsSql ? "Run backend/supabase/RUN_IN_SQL_EDITOR.sql in Supabase SQL Editor" : null
  };

  if (process.env.NODE_ENV !== "production") {
    payload.supabase_url = process.env.SUPABASE_URL || null;
  }

  res.status(200).json(payload);
});

app.use("/api/auth/google", googleAuthRoutes);
app.use("/auth/google", googleAuthRoutes);
app.use("/api/auth", authRoutes);
/** Same routes without /api prefix when NEXT_PUBLIC_API_URL omits /api */
app.use("/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/earnings", earningRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", auth, checkPermission, adminRoutes);
app.use("/api/admin", auth, checkPermission, adminPromotionsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/feature-flags", featureFlagsRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/study-rooms", studyRoomsRoutes);

app.use((req, res, next) => {
  const path = req.path || "";
  if (path.startsWith("/api/") || path.startsWith("/auth/")) {
    return res.status(404).json({ success: false, error: "المسار غير موجود" });
  }
  next();
});

setupExpressSentry(app);

app.use((err, req, res, next) => {
  captureException(err);
  sanitizeErrors(err, req, res, next);
});

export default app;
