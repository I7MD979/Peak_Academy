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
import notificationRoutes from "./routes/notifications.js";
import studentRoutes from "./routes/student.js";
import studyRoomsRoutes from "./routes/studyRooms.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());
app.use(timeout);
app.use("/api/", limiter);

export const API_VERSION = "2026-06-02-sessions-v5";

app.use("/api", (_req, res, next) => {
  res.setHeader("X-Peak-Api-Version", API_VERSION);
  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
    api_version: API_VERSION,
    sessions_query: "plain-select"
  });
});

app.get("/api/diag", async (_req, res) => {
  const { supabase } = await import("./lib/supabase.js");
  const { getCacheMode } = await import("./lib/cache.js");
  const tables = ["users", "sessions", "session_enrollments", "withdrawal_requests", "teacher_profiles"];
  const checks = {};

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
    checks[table] = error ? { ok: false, code: error.code, message: error.message } : { ok: true };
  }

  const needsSql = Object.values(checks).some((c) => !c.ok);
  res.status(200).json({
    success: true,
    api_version: API_VERSION,
    supabase_url: process.env.SUPABASE_URL || null,
    cache_mode: getCacheMode(),
    tables: checks,
    action: needsSql ? "Run backend/supabase/RUN_IN_SQL_EDITOR.sql in Supabase SQL Editor" : null
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/earnings", earningRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/study-rooms", studyRoomsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

export default app;
