import { describe, it, expect } from "vitest";
import { blockSSRF } from "../../src/middleware/security.js";
import { mockReq, mockRes, mockNext } from "./_helpers.js";

describe("OWASP A10 — SSRF Prevention", () => {
  const blockedUrls = [
    "http://localhost/admin",
    "http://127.0.0.1/secrets",
    "http://10.0.0.1/internal",
    "http://192.168.1.1/router",
    "http://172.16.0.1/internal",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/"
  ];

  blockedUrls.forEach((url) => {
    it(`يبلوك SSRF: ${url}`, () => {
      const req = mockReq({ body: { url } });
      const res = mockRes();
      const next = mockNext();

      blockSSRF(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res._body.code).toBe("SSRF_BLOCKED");
      expect(next).not.toHaveBeenCalled();
    });
  });

  it("يسمح بـ URL خارجي عادي", () => {
    const req = mockReq({ body: { url: "https://api.example.com/data" } });
    const res = mockRes();
    const next = mockNext();

    blockSSRF(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("يفحص كل الـ URL fields (url, redirect, callback, webhook)", () => {
    const fields = ["url", "redirect", "callback", "webhook", "image_url", "avatar_url"];
    fields.forEach((field) => {
      const req = mockReq({ body: { [field]: "http://127.0.0.1/internal" } });
      const res = mockRes();
      const next = mockNext();

      blockSSRF(req, res, next);

      expect(res.statusCode).toBe(400);
    });
  });

  it("يتجاهل URL غير صالح بدون error", () => {
    const req = mockReq({ body: { url: "not-a-url" } });
    const res = mockRes();
    const next = mockNext();

    blockSSRF(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
