import { describe, it, expect } from "vitest";
import { validateCsrf, validateOrigin } from "../../src/middleware/csrf.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("CWE-352 — CSRF Protection", () => {
  describe("validateCsrf()", () => {
    it("GET requests تعدّي بدون token (safe method)", () => {
      const req = mockReq({ method: "GET" });
      const res = mockRes();
      const next = mockNext();

      validateCsrf(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("Bearer token يتجاوز CSRF (API clients)", () => {
      const req = mockReq({
        method: "POST",
        headers: { authorization: "Bearer jwt_token_here" }
      });
      const res = mockRes();
      const next = mockNext();

      validateCsrf(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("POST بدون CSRF token → 403", () => {
      const req = mockReq({ method: "POST", cookies: {}, headers: {} });
      const res = mockRes();
      const next = mockNext();

      validateCsrf(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._body.code).toBe("CSRF_MISSING");
    });

    it("POST مع CSRF tokens متطابقة → يعدّي", () => {
      const token = "a".repeat(64);
      const req = mockReq({
        method: "POST",
        cookies: { __csrf: token },
        headers: { "x-csrf-token": token }
      });
      const res = mockRes();
      const next = mockNext();

      validateCsrf(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("POST مع CSRF tokens مختلفة → 403", () => {
      const req = mockReq({
        method: "POST",
        cookies: { __csrf: "a".repeat(64) },
        headers: { "x-csrf-token": "b".repeat(64) }
      });
      const res = mockRes();
      const next = mockNext();

      validateCsrf(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._body.code).toBe("CSRF_INVALID");
    });
  });

  describe("validateOrigin()", () => {
    it("يبلوك origin غير مسموح", () => {
      const req = mockReq({
        method: "POST",
        headers: { origin: "https://evil.com" }
      });
      const res = mockRes();
      const next = mockNext();

      validateOrigin(["https://peak-academy.net"])(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._body.code).toBe("INVALID_ORIGIN");
    });

    it("يسمح بـ origin مصرح له", () => {
      const req = mockReq({
        method: "POST",
        headers: { origin: "https://peak-academy.net" }
      });
      const res = mockRes();
      const next = mockNext();

      validateOrigin(["https://peak-academy.net"])(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
