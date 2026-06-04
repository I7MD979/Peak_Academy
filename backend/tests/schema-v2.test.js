import { describe, it } from "node:test";
import assert from "node:assert";
import { sessionPrice, sessionStartTime, mapCheckoutResponse } from "../src/lib/schema.js";

describe("schema v2 helpers", () => {
  it("sessionPrice prefers price over price_per_student", () => {
    assert.strictEqual(sessionPrice({ price: 80, price_per_student: 60 }), 80);
    assert.strictEqual(sessionPrice({ price_per_student: 60 }), 60);
  });

  it("sessionStartTime prefers start_time", () => {
    assert.strictEqual(sessionStartTime({ start_time: "2026-01-01", scheduled_at: "x" }), "2026-01-01");
  });

  it("mapCheckoutResponse aliases paymob_url", () => {
    const out = mapCheckoutResponse({ checkout_url: "https://pay.test" });
    assert.strictEqual(out.paymob_url, "https://pay.test");
  });
});
