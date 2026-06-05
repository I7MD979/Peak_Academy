import express from "express";
import cors from "cors";
import helmet from "helmet";
import { limiter } from "./middleware/rateLimit.js";
import { timeout } from "./middleware/timeout.js";

import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessions.js";
import paymentRoutes from "./routes/payments.js";
import earningRoutes from "./routes/earnings.js";
import questionRoutes from "./routes/questions.js";
import parentRoutes from "./routes/parent.js";
import adminRoutes from "./routes/admin.js";
import adminPromotionsRoutes from "./routes/adminPromotions.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import notificationRoutes from "./routes/notifications.js";
import studentRoutes from "./routes/student.js";
import teacherRoutes from "./routes/teacher.js";
import studyRoomsRoutes from "./routes/studyRooms.js";
import enrollmentRoutes from "./routes/enrollments.js";
import promotionRoutes from "./routes/promotions.js";
import { captureException, setupExpressSentry } from "./lib/sentry.js";

const app = express();

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

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(timeout);
app.use(["/api", "/auth"], limiter);

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

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
    api_version: API_VERSION,
    sessions_query: "plain-select",
    supabase_project_ref: getSupabaseProjectRef()
  });
});

app.get("/api/diag", async (_req, res) => {
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

app.use("/api/auth", authRoutes);
/** Same routes without /api prefix when NEXT_PUBLIC_API_URL omits /api */
app.use("/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/earnings", earningRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminPromotionsRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/notifications", notificationRoutes);
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

app.use((err, _req, res, _next) => {
  captureException(err);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

export default app;
