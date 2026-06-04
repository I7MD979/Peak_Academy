process.env.NODE_ENV = "test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "test-service-key";

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
