import { describe, it, expect } from "vitest";
import { selfOnly, requireRole, blockPathTraversal } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A01 — Broken Access Control", () => {
  describe("selfOnly() — IDOR Protection", () => {
    it("يمنع user من الوصول لـ resource مش بتاعته", () => {
      const req = mockReq({
        params: { userId: "other-user-id" },
        user: { id: "my-user-id", role: "student" }
      });
      const res = mockRes();
      const next = mockNext();

      selfOnly("userId")(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._body.code).toBe("FORBIDDEN");
      expect(next).not.toHaveBeenCalled();
    });

    it("يسمح لـ user بالوصول لـ resource بتاعته", () => {
      const req = mockReq({
        params: { userId: "my-user-id" },
        user: { id: "my-user-id", role: "student" }
      });
      const res = mockRes();
      const next = mockNext();

      selfOnly("userId")(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it("admin يقدر يوصل لـ resource أي حد", () => {
      const req = mockReq({
        params: { userId: "other-user-id" },
        user: { id: "admin-id", role: "admin" }
      });
      const res = mockRes();
      const next = mockNext();

      selfOnly("userId")(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("لو مفيش targetId — يكمل عادي", () => {
      const req = mockReq({ params: {}, user: { id: "user-1", role: "student" } });
      const res = mockRes();
      const next = mockNext();

      selfOnly("userId")(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("blockPathTraversal() — A01 Path Traversal", () => {
    const traversalPayloads = [
      "/../etc/passwd",
      "/api/files/..%2F..%2Fetc%2Fpasswd",
      "/api/test/%00null",
      "/api/test/..\\..\\windows",
      "/api/test/%2F..%5C..%5C"
    ];

    traversalPayloads.forEach((path) => {
      it(`يبلوك path traversal: ${path}`, () => {
        const req = mockReq({ originalUrl: path, params: {}, query: {} });
        const res = mockRes();
        const next = mockNext();

        blockPathTraversal(req, res, next);

        expect(res.statusCode).toBe(400);
        expect(res._body.code).toBe("PATH_TRAVERSAL");
        expect(next).not.toHaveBeenCalled();
      });
    });

    it("يسمح بـ URL سليم", () => {
      const req = mockReq({ originalUrl: "/api/sessions/123", params: {}, query: {} });
      const res = mockRes();
      const next = mockNext();

      blockPathTraversal(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("requireRole() — NIST AC-3", () => {
    it("يمنع student من endpoint مخصص للـ admin", () => {
      const req = mockReq({ user: { id: "u1", role: "student" } });
      const res = mockRes();
      const next = mockNext();

      requireRole("admin")(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res._body.code).toBe("INSUFFICIENT_ROLE");
    });

    it("يسمح لـ admin بـ admin endpoint", () => {
      const req = mockReq({ user: { id: "u1", role: "admin" } });
      const res = mockRes();
      const next = mockNext();

      requireRole("admin")(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("يسمح لأكتر من role", () => {
      const req = mockReq({ user: { id: "u1", role: "teacher" } });
      const res = mockRes();
      const next = mockNext();

      requireRole("admin", "teacher")(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("بدون user → 401", () => {
      const req = mockReq({ user: null });
      const res = mockRes();
      const next = mockNext();

      requireRole("admin")(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res._body.code).toBe("UNAUTHENTICATED");
    });
  });
});
