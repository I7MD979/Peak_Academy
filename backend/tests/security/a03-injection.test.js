import { describe, it, expect } from "vitest";
import { sanitizeInput, blockSQLInjection } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A03 — Injection Prevention", () => {
  describe("blockSQLInjection()", () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1; SELECT * FROM users",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "1' AND 1=1 --"
    ];

    sqlPayloads.forEach((payload) => {
      it(`يبلوك SQL injection في body: ${payload.slice(0, 30)}`, () => {
        const req = mockReq({ body: { email: payload }, query: {}, params: {} });
        const res = mockRes();
        const next = mockNext();

        blockSQLInjection(req, res, next);

        expect(res.statusCode).toBe(400);
        expect(res._body.code).toBe("INJECTION_DETECTED");
        expect(next).not.toHaveBeenCalled();
      });
    });

    it("يسمح بـ input عادي", () => {
      const req = mockReq({ body: { email: "user@test.com", name: "أحمد" }, query: {}, params: {} });
      const res = mockRes();
      const next = mockNext();

      blockSQLInjection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("يبلوك SQL injection في query params", () => {
      const req = mockReq({ body: {}, query: { search: "' OR 1=1 --" }, params: {} });
      const res = mockRes();
      const next = mockNext();

      blockSQLInjection(req, res, next);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("sanitizeInput() — XSS Prevention", () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      "javascript:alert(1)",
      '<img onerror="alert(1)" src="x">',
      '<iframe src="evil.com">',
      "data:text/html,<script>alert(1)</script>"
    ];

    xssPayloads.forEach((payload) => {
      it(`يـ sanitize XSS: ${payload.slice(0, 30)}`, () => {
        const req = mockReq({ body: { name: payload }, query: {}, params: {} });
        const res = mockRes();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body.name).not.toContain("<script");
        expect(req.body.name).not.toContain("javascript:");
      });
    });

    it("يحذف $ keys (NoSQL injection prevention)", () => {
      const req = mockReq({
        body: { $where: "this.admin", name: "test" },
        query: {},
        params: {}
      });
      const res = mockRes();
      const next = mockNext();

      sanitizeInput(req, res, next);

      expect(req.body.$where).toBeUndefined();
      expect(req.body.name).toBe("test");
    });

    it("يحذف . keys (dot notation injection)", () => {
      const req = mockReq({
        body: { "user.role": "admin", name: "test" },
        query: {},
        params: {}
      });
      const res = mockRes();
      const next = mockNext();

      sanitizeInput(req, res, next);

      expect(req.body["user.role"]).toBeUndefined();
    });

    it("يـ sanitize deep nested objects", () => {
      const req = mockReq({
        body: { user: { profile: { bio: "<script>xss</script>" } } },
        query: {},
        params: {}
      });
      const res = mockRes();
      const next = mockNext();

      sanitizeInput(req, res, next);

      expect(req.body.user.profile.bio).not.toContain("<script");
    });
  });
});
