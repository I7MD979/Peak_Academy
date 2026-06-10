import { describe, it, expect } from "vitest";
import { validateInputLengths } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("CWE-20 — Input Validation", () => {
  const lengthTests = [
    { field: "email", max: 254 },
    { field: "password", max: 128 },
    { field: "full_name", max: 100 },
    { field: "title", max: 200 },
    { field: "description", max: 5000 },
    { field: "message", max: 2000 },
    { field: "code", max: 50 },
    { field: "phone", max: 20 }
  ];

  lengthTests.forEach(({ field, max }) => {
    it(`يرفض ${field} أطول من ${max} حرف`, () => {
      const req = mockReq({
        body: { [field]: "a".repeat(max + 1) },
        query: {}
      });
      const res = mockRes();
      const next = mockNext();

      validateInputLengths(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._body.code).toBe("INPUT_TOO_LONG");
    });

    it(`يقبل ${field} بالحد المسموح (${max} حرف)`, () => {
      const req = mockReq({
        body: { [field]: "a".repeat(max) },
        query: {}
      });
      const res = mockRes();
      const next = mockNext();

      validateInputLengths(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
