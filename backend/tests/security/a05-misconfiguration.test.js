import { describe, it, expect } from "vitest";
import { securityHeaders, sanitizeErrors } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A05 — Security Misconfiguration", () => {
  describe("securityHeaders()", () => {
    it("يضيف HSTS header", () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      securityHeaders(req, res, next);

      expect(res.headers["Strict-Transport-Security"]).toContain("max-age=31536000");
      expect(res.headers["Strict-Transport-Security"]).toContain("includeSubDomains");
    });

    it("يضيف X-Frame-Options: DENY (Clickjacking)", () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      securityHeaders(req, res, next);

      expect(res.headers["X-Frame-Options"]).toBe("DENY");
    });

    it("يضيف X-Content-Type-Options: nosniff (MIME sniffing)", () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      securityHeaders(req, res, next);

      expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("يحذف X-Powered-By (information disclosure)", () => {
      const req = mockReq();
      const res = mockRes();
      res.headers["X-Powered-By"] = "Express";
      const next = mockNext();

      securityHeaders(req, res, next);

      expect(res.headers["X-Powered-By"]).toBeUndefined();
    });

    it("يضيف Permissions-Policy (camera, mic, geolocation)", () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      securityHeaders(req, res, next);

      const policy = res.headers["Permissions-Policy"];
      expect(policy).toContain("camera=()");
      expect(policy).toContain("microphone=()");
      expect(policy).toContain("geolocation=()");
    });
  });

  describe("sanitizeErrors() — Information Disclosure", () => {
    it("في production: بيخفي stack trace", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const err = new Error("Internal database error with sensitive info");
      err.status = 500;
      const req = mockReq();
      const res = mockRes();

      sanitizeErrors(err, req, res, mockNext());

      expect(res._body.error).toBe("حدث خطأ داخلي");
      expect(res._body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("في development: بيظهر stack trace", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const err = new Error("Test error");
      err.status = 500;
      err.stack = "Error: Test\n  at test.js:1";
      const req = mockReq();
      const res = mockRes();

      sanitizeErrors(err, req, res, mockNext());

      expect(res._body.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("يحتفظ بـ status code الصحيح", () => {
      const err = new Error("Not found");
      err.status = 404;
      const req = mockReq();
      const res = mockRes();

      sanitizeErrors(err, req, res, mockNext());

      expect(res.statusCode).toBe(404);
    });
  });
});
