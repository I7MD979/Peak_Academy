import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { buildPaymobHmacPayload } from "../../src/utils/paymob-hmac.js";
import {
  verifyPaymobHmacStrict,
  validatePaymobTransaction,
  verifyTransactionAmount
} from "../../src/utils/paymob-security.js";

const TEST_SECRET = "test_hmac_secret_key_peak_academy";

describe("OWASP A08 — Paymob Data Integrity", () => {
  beforeEach(() => {
    process.env.PAYMOB_HMAC_SECRET = TEST_SECRET;
    process.env.NODE_ENV = "test";
  });

  describe("buildPaymobHmacPayload()", () => {
    it("يبني الـ payload بالترتيب الصح", () => {
      const obj = {
        amount_cents: 5000,
        created_at: "2024-01-01",
        currency: "EGP",
        error_occured: false,
        has_parent_transaction: false,
        id: 12345,
        integration_id: 67890,
        is_3d_secure: false,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 99 },
        owner: 111,
        pending: false,
        source_data: { pan: "1234", sub_type: "VISA", type: "card" },
        success: true
      };

      const payload = buildPaymobHmacPayload(obj);
      expect(typeof payload).toBe("string");
      expect(payload).toContain("5000");
      expect(payload).toContain("EGP");
      expect(payload).toContain("true");
    });

    it("يتعامل مع null/undefined بـ empty string", () => {
      const obj = {
        amount_cents: null,
        created_at: undefined,
        currency: "EGP",
        success: false
      };
      const payload = buildPaymobHmacPayload(obj);
      expect(payload).toBeDefined();
    });

    it('boolean: true → "true", false → "false"', () => {
      const obj1 = { success: true };
      const obj2 = { success: false };
      const p1 = buildPaymobHmacPayload(obj1);
      const p2 = buildPaymobHmacPayload(obj2);
      expect(p1).not.toBe(p2);
      expect(p1).toContain("true");
      expect(p2).toContain("false");
    });
  });

  describe("verifyPaymobHmacStrict() — Timing-Safe", () => {
    it("يقبل HMAC صحيح", () => {
      const obj = { amount_cents: 5000, currency: "EGP", success: true };
      const payload = buildPaymobHmacPayload(obj);
      const validHmac = crypto.createHmac("sha512", TEST_SECRET).update(payload).digest("hex");

      const result = verifyPaymobHmacStrict({ obj }, validHmac);
      expect(result.valid).toBe(true);
    });

    it("يرفض HMAC مزور (tampered data)", () => {
      const obj = { amount_cents: 5000, currency: "EGP", success: true };
      const result = verifyPaymobHmacStrict({ obj }, "fake_hmac_0000");
      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it("يرفض HMAC مفقود", () => {
      const result = verifyPaymobHmacStrict({ obj: {} }, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("missing_hmac");
    });

    it("يرفض لو الـ payload غلط", () => {
      const result = verifyPaymobHmacStrict(null, "some_hmac");
      expect(result.valid).toBe(false);
    });

    it("يرفض لو الـ length مختلف (timing-safe check)", () => {
      const result = verifyPaymobHmacStrict({ obj: {} }, "ab");
      expect(result.valid).toBe(false);
    });
  });

  describe("validatePaymobTransaction()", () => {
    it("يقبل transaction صحيح", () => {
      const txn = {
        id: 12345,
        success: true,
        amount_cents: 5000,
        currency: "EGP",
        order: { id: 99 }
      };
      const result = validatePaymobTransaction(txn);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("يرفض transaction بدون required fields", () => {
      const result = validatePaymobTransaction({ success: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("يرفض currency مش EGP", () => {
      const txn = { id: 1, success: true, amount_cents: 100, currency: "USD", order: { id: 1 } };
      const result = validatePaymobTransaction(txn);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("currency"))).toBe(true);
    });

    it("يرفض amount سالب أو كبير جداً", () => {
      const txn1 = { id: 1, success: true, amount_cents: -100, currency: "EGP", order: { id: 1 } };
      const txn2 = { id: 1, success: true, amount_cents: 999999999, currency: "EGP", order: { id: 1 } };

      expect(validatePaymobTransaction(txn1).valid).toBe(false);
      expect(validatePaymobTransaction(txn2).valid).toBe(false);
    });

    it("يرفض refunded أو voided transactions", () => {
      const txn = {
        id: 1,
        success: true,
        amount_cents: 100,
        currency: "EGP",
        order: { id: 1 },
        is_refunded: true
      };
      const result = validatePaymobTransaction(txn);
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyTransactionAmount() — Amount Tampering Prevention", () => {
    it("يقبل amount مطابق", async () => {
      const result = await verifyTransactionAmount(5000, 5000);
      expect(result.valid).toBe(true);
    });

    it("يرفض amount مختلف (price manipulation)", async () => {
      const result = await verifyTransactionAmount(100, 5000);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("amount_mismatch");
    });

    it("يقبل فرق في حدود الـ tolerance", async () => {
      const result = await verifyTransactionAmount(5001, 5000, 5);
      expect(result.valid).toBe(true);
    });
  });
});
