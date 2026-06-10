import { describe, it, expect } from "vitest";
import { PERMISSIONS_MATRIX } from "../../src/middleware/permissions.js";

function matchesPattern(pattern, key) {
  const regexStr = pattern
    .replace(/:[^/]+/g, "[^/]+")
    .replace(/\//g, "\\/")
    .replace(/\*/g, ".*");
  return new RegExp(`^${regexStr}$`).test(key);
}

function isAllowed(method, path, role) {
  const key = `${method} ${path}`;

  if (PERMISSIONS_MATRIX[key]) {
    const allowed = PERMISSIONS_MATRIX[key];
    return allowed.includes("*") || allowed.includes(role);
  }

  for (const [pattern, roles] of Object.entries(PERMISSIONS_MATRIX)) {
    if (matchesPattern(pattern, key)) {
      return roles.includes("*") || roles.includes(role);
    }
  }

  if (path.startsWith("/api/admin")) {
    return role === "admin" || role === "supervisor";
  }

  return true;
}

describe("Permissions Matrix — Role-Based Access Control", () => {
  describe("Admin endpoints", () => {
    it("admin يدخل /api/admin/stats", () => {
      expect(isAllowed("GET", "/api/admin/stats", "admin")).toBe(true);
    });

    it("student لا يدخل /api/admin/stats", () => {
      expect(isAllowed("GET", "/api/admin/stats", "student")).toBe(false);
    });

    it("teacher لا يدخل /api/admin/users", () => {
      expect(isAllowed("GET", "/api/admin/users", "teacher")).toBe(false);
    });

    it("parent لا يدخل /api/admin/reports", () => {
      expect(isAllowed("GET", "/api/admin/reports", "parent")).toBe(false);
    });
  });

  describe("Session endpoints", () => {
    it("teacher يقدر ينشئ session", () => {
      expect(isAllowed("POST", "/api/sessions", "teacher")).toBe(true);
    });

    it("student لا يقدر ينشئ session", () => {
      expect(isAllowed("POST", "/api/sessions", "student")).toBe(false);
    });

    it("student يقدر يعمل enroll", () => {
      expect(isAllowed("POST", "/api/sessions/:id/enroll", "student")).toBe(true);
    });

    it("teacher لا يقدر يعمل enroll", () => {
      expect(isAllowed("POST", "/api/sessions/:id/enroll", "teacher")).toBe(false);
    });

    it("teacher يقدر يبدأ session", () => {
      expect(isAllowed("POST", "/api/sessions/:id/start", "teacher")).toBe(true);
    });

    it("student لا يقدر يبدأ session", () => {
      expect(isAllowed("POST", "/api/sessions/:id/start", "student")).toBe(false);
    });

    it("teacher يقدر ينهي session", () => {
      expect(isAllowed("POST", "/api/sessions/:id/end", "teacher")).toBe(true);
    });
  });

  describe("Payment endpoints", () => {
    it("student يقدر يبدأ payment", () => {
      expect(isAllowed("POST", "/api/payments/initiate", "student")).toBe(true);
    });

    it("teacher لا يقدر يبدأ payment", () => {
      expect(isAllowed("POST", "/api/payments/initiate", "teacher")).toBe(false);
    });

    it("student يقدر يتحقق من الـ promo", () => {
      expect(isAllowed("POST", "/api/payments/validate-promo", "student")).toBe(true);
    });
  });

  describe("Earnings endpoints", () => {
    it("teacher يقدر يشوف أرباحه", () => {
      expect(isAllowed("GET", "/api/earnings", "teacher")).toBe(true);
    });

    it("student لا يقدر يشوف الأرباح", () => {
      expect(isAllowed("GET", "/api/earnings", "student")).toBe(false);
    });

    it("teacher يقدر يطلب سحب", () => {
      expect(isAllowed("POST", "/api/earnings/withdraw", "teacher")).toBe(true);
    });

    it("student لا يقدر يطلب سحب", () => {
      expect(isAllowed("POST", "/api/earnings/withdraw", "student")).toBe(false);
    });
  });

  describe("Subscription endpoints", () => {
    it("student يقدر يشتري اشتراك", () => {
      expect(isAllowed("POST", "/api/subscriptions/purchase", "student")).toBe(true);
    });

    it("teacher لا يقدر يشتري اشتراك", () => {
      expect(isAllowed("POST", "/api/subscriptions/purchase", "teacher")).toBe(false);
    });

    it("كل الأدوار تشوف الـ plans", () => {
      expect(isAllowed("GET", "/api/subscriptions/plans", "student")).toBe(true);
      expect(isAllowed("GET", "/api/subscriptions/plans", "teacher")).toBe(true);
      expect(isAllowed("GET", "/api/subscriptions/plans", "parent")).toBe(true);
    });
  });

  describe("Parent endpoints", () => {
    it("parent يشوف أبناءه", () => {
      expect(isAllowed("GET", "/api/parent/children", "parent")).toBe(true);
    });

    it("student لا يشوف parent/children", () => {
      expect(isAllowed("GET", "/api/parent/children", "student")).toBe(false);
    });

    it("teacher لا يشوف parent/reports", () => {
      expect(isAllowed("GET", "/api/parent/reports", "teacher")).toBe(false);
    });
  });

  describe("Auth endpoints — متاحة للكل", () => {
    it("كل الأدوار تقدر تشوف /api/auth/me", () => {
      for (const role of ["student", "teacher", "parent", "admin"]) {
        expect(isAllowed("GET", "/api/auth/me", role)).toBe(true);
      }
    });
  });
});
