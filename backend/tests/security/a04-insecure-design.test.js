import { describe, it, expect } from "vitest";
import { validateUUID } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A04 — Insecure Design", () => {
  describe("validateUUID() — ID Enumeration Prevention", () => {
    const invalidIds = [
      "1",
      "123",
      "admin",
      "../etc",
      "null",
      "0",
      "' OR 1=1",
      "123e4567-e89b-12d3-a456"
    ];

    invalidIds.forEach((id) => {
      it(`يرفض ID غير UUID: "${id}"`, () => {
        const req = mockReq({ params: { id } });
        const res = mockRes();
        const next = mockNext();

        validateUUID("id")(req, res, next);

        expect(res.statusCode).toBe(400);
        expect(res._body.code).toBe("INVALID_ID");
        expect(next).not.toHaveBeenCalled();
      });
    });

    it("يسمح بـ UUID صحيح", () => {
      const req = mockReq({ params: { id: "123e4567-e89b-12d3-a456-426614174000" } });
      const res = mockRes();
      const next = mockNext();

      validateUUID("id")(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("يكمل لو مفيش ID في الـ params", () => {
      const req = mockReq({ params: {} });
      const res = mockRes();
      const next = mockNext();

      validateUUID("id")(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
