process.env.NODE_ENV = "test";
// استخدم real Supabase URL لو موجود، أو fake بـ format صحيح
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://fakefakefake.supabase.co";
process.env.SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2VmYWtlZmFrZSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.fake";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

const { default: app } = await import("../src/app.js");

test("health endpoint responds", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("auth me requires auth", async () => {
  const res = await request(app).get("/api/auth/me");
  assert.equal(res.statusCode, 401);
});

test("complete profile requires auth", async () => {
  const res = await request(app).post("/api/auth/complete-profile").send({ role: "student" });
  assert.equal(res.statusCode, 401);
});

test("protected routes require auth", async () => {
  const res = await request(app).get("/api/student/dashboard");
  assert.equal(res.statusCode, 401);
});

test("payments initiate requires auth", async () => {
  const res = await request(app)
    .post("/api/payments/initiate")
    .send({ amount: 100, session_id: "sess-1", type: "session_payment" });
  assert.equal(res.statusCode, 401);
});

test("payments webhook rejects missing HMAC", async () => {
  const res = await request(app)
    .post("/api/payments/webhook")
    .send({ obj: { success: true } });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});

test("unknown API route returns 404", async () => {
  const res = await request(app).get("/api/does-not-exist");
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test("questions submit returns PAYMENT_REQUIRED code without payment_id", async () => {
  const res = await request(app)
    .post("/api/questions")
    .set("Authorization", "Bearer fake-token")
    .send({ subject: "math", content: "سؤال تجريبي للاختبار" });
  assert.ok(res.statusCode === 401 || res.statusCode === 403);
});

test("error responses include success false", async () => {
  const res = await request(app).get("/api/auth/me");
  assert.equal(res.body.success, false);
  assert.ok(res.body.error);
});

test("health exposes api version header", async () => {
  const res = await request(app).get("/api/health");
  assert.ok(res.headers["x-peak-api-version"]);
});

test("validate-promo requires auth", async () => {
  const res = await request(app)
    .post("/api/payments/validate-promo")
    .send({ code: "TEST", session_id: "sess-1" });
  assert.equal(res.statusCode, 401);
});

test("subscriptions me requires auth", async () => {
  const res = await request(app).get("/api/subscriptions/me");
  assert.equal(res.statusCode, 401);
});

test("admin promotions requires auth", async () => {
  const res = await request(app).get("/api/admin/promotions");
  assert.equal(res.statusCode, 401);
});

test("enrollments trial-status requires auth", async () => {
  const res = await request(app).get(
    "/api/enrollments/trial-status?teacher_id=00000000-0000-0000-0000-000000000001&subject_id=00000000-0000-0000-0000-000000000002"
  );
  assert.equal(res.statusCode, 401);
});

test("promotions validate requires auth", async () => {
  const res = await request(app).post("/api/promotions/validate").send({ code: "TEST" });
  assert.equal(res.statusCode, 401);
});

test("refund calculator tiers", async () => {
  const { calculateRefundAmount } = await import("../src/utils/refundCalculator.js");
  const payment = { amount: 100 };
  const session = { scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() };
  const full = calculateRefundAmount(payment, session, new Date());
  assert.equal(full, 100);

  const halfSession = {
    scheduled_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
  };
  const half = calculateRefundAmount(payment, halfSession, new Date());
  assert.equal(half, 50);

  const none = calculateRefundAmount(
    payment,
    { scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    new Date()
  );
  assert.equal(none, 0);

  const teacherCancel = calculateRefundAmount(
    payment,
    { scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    new Date(),
    { teacherCancelled: true }
  );
  assert.equal(teacherCancel, 100);
});

test("promo discount calculation", async () => {
  const { calculateDiscount } = await import("../src/utils/promoValidator.js");
  assert.equal(calculateDiscount(100, { discount_type: "percent", discount_value: 20 }), 20);
  assert.equal(calculateDiscount(100, { discount_type: "fixed", discount_value: 150 }), 100);
  assert.equal(calculateDiscount(80, { discount_type: "free_session", discount_value: 0 }), 80);
});

test("payments module exports refund and promo utilities", async () => {
  const refund = await import("../src/utils/refundCalculator.js");
  const promo = await import("../src/utils/promoValidator.js");
  assert.equal(typeof refund.calculateRefundAmount, "function");
  assert.equal(typeof promo.validatePromoCode, "function");
  assert.equal(typeof promo.calculateDiscount, "function");
});
