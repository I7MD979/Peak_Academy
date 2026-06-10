import { describe, it, expect } from "vitest";
import { stripOwnershipFields, requireValidUUID } from "../../src/middleware/ownership.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP API1 — BOLA / Ownership Protection", () => {
  describe("stripOwnershipFields() — Mass Assignment Prevention", () => {
    const protectedFields = [
      "user_id",
      "owner_id",
      "actor_id",
      "created_by",
      "teacher_id",
      "student_id"
    ];

    protectedFields.forEach((field) => {
      it(`يحذف ${field} من الـ body (non-admin)`, () => {
        const req = mockReq({
          method: "POST",
          body: { [field]: "injected-id", title: "Test Session" },
          user: { id: "u1", role: "student" }
        });
        const res = mockRes();
        const next = mockNext();

        stripOwnershipFields(req, res, next);

        expect(req.body[field]).toBeUndefined();
        expect(req.body.title).toBe("Test Session");
        expect(next).toHaveBeenCalled();
      });
    });

    it("admin يقدر يبعت ownership fields", () => {
      const req = mockReq({
        method: "POST",
        body: { user_id: "target-user", title: "Admin Action" },
        user: { id: "admin-1", role: "admin" }
      });
      const res = mockRes();
      const next = mockNext();

      stripOwnershipFields(req, res, next);

      expect(req.body.user_id).toBe("target-user");
    });
  });

  describe("requireValidUUID() — ID Format Enforcement", () => {
    it("يرفض non-UUID param", () => {
      const req = mockReq({ params: { id: "123-invalid" }, body: {} });
      const res = mockRes();
      const next = mockNext();

      requireValidUUID("id")(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._body.code).toBe("INVALID_UUID");
    });

    it("يقبل UUID صحيح", () => {
      const req = mockReq({
        params: { id: "123e4567-e89b-12d3-a456-426614174000" },
        body: {}
      });
      const res = mockRes();
      const next = mockNext();

      requireValidUUID("id")(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
