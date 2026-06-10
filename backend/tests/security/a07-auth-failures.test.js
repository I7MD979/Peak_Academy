import { describe, it, expect } from "vitest";
import {
  verifyPaymobHMAC,
  uniformAuthResponse,
  sanitizeLogging
} from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A07 — Identification and Authentication Failures", () => {
  describe("verifyPaymobHMAC() — webhook guard", () => {
    it("يرفض webhook بدون HMAC", () => {
      const req = mockReq({ body: {}, query: {} });
      const res = mockRes();
      const next = mockNext();

      verifyPaymobHMAC(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._body.code).toBe("MISSING_HMAC");
      expect(next).not.toHaveBeenCalled();
    });

    it("يسمح بـ HMAC موجود مع secret مضبوط", () => {
      process.env.PAYMOB_HMAC_SECRET = "test_secret";
      const req = mockReq({ body: { hmac: "abc123" }, query: {} });
      const res = mockRes();
      const next = mockNext();

      verifyPaymobHMAC(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("uniformAuthResponse() — account enumeration prevention", () => {
    it("يحوّل 404 على auth paths إلى 401 برسالة موحدة", () => {
      const req = mockReq({ path: "/api/auth/login" });
      const res = mockRes();
      const next = mockNext();

      uniformAuthResponse(req, res, next);
      expect(next).toHaveBeenCalled();

      res.statusCode = 404;
      res.json({ success: false, error: "User not found" });

      expect(res.statusCode).toBe(401);
      expect(res._body.error).toBe("البريد أو كلمة المرور غير صحيحة");
    });
  });

  describe("sanitizeLogging() — sensitive data redaction", () => {
    it("يخفي password و token من body", () => {
      const req = mockReq({
        body: {
          password: "Secret123!",
          token: "jwt-token",
          email: "user@test.com"
        }
      });
      const res = mockRes();
      const next = mockNext();

      sanitizeLogging(req, res, next);

      expect(req.body.password).toBe("[REDACTED]");
      expect(req.body.token).toBe("[REDACTED]");
      expect(req.body.email).toBe("user@test.com");
      expect(next).toHaveBeenCalled();
    });
  });
});
