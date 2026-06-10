import { describe, it, expect } from "vitest";
import { calculateDiscount, applyPromoToPrice } from "../../src/utils/promoValidator.js";

describe("calculateDiscount", () => {
  it("يحسب خصم نسبة مئوية صح", () => {
    const promo = { discount_type: "percent", discount_value: 20 };
    expect(calculateDiscount(100, promo)).toBe(20);
  });

  it("يحسب خصم نسبة مئوية على أسعار كسرية", () => {
    const promo = { discount_type: "percent", discount_value: 15 };
    expect(calculateDiscount(80, promo)).toBe(12);
  });

  it("خصم 100% يرجع كل السعر", () => {
    const promo = { discount_type: "percent", discount_value: 100 };
    expect(calculateDiscount(50, promo)).toBe(50);
  });

  it("يحسب خصم مبلغ ثابت صح", () => {
    const promo = { discount_type: "fixed", discount_value: 30 };
    expect(calculateDiscount(100, promo)).toBe(30);
  });

  it("خصم ثابت أكبر من السعر يرجع السعر كامل (مش سالب)", () => {
    const promo = { discount_type: "fixed", discount_value: 200 };
    expect(calculateDiscount(100, promo)).toBe(100);
  });

  it("free_session يرجع السعر كامل كخصم", () => {
    const promo = { discount_type: "free_session", discount_value: 0 };
    expect(calculateDiscount(75, promo)).toBe(75);
  });

  it("بدون promo يرجع 0", () => {
    expect(calculateDiscount(100, null)).toBe(0);
    expect(calculateDiscount(100, undefined)).toBe(0);
  });

  it("سعر صفر يرجع خصم صفر", () => {
    const promo = { discount_type: "percent", discount_value: 50 };
    expect(calculateDiscount(0, promo)).toBe(0);
  });

  it("نوع خصم غير معروف يرجع 0", () => {
    const promo = { discount_type: "unknown_type", discount_value: 50 };
    expect(calculateDiscount(100, promo)).toBe(0);
  });

  it("يتعامل مع originalPrice كـ string", () => {
    const promo = { discount_type: "percent", discount_value: 10 };
    expect(calculateDiscount("100", promo)).toBe(10);
  });
});

describe("applyPromoToPrice", () => {
  it("يرجع finalPrice صح بعد الخصم", () => {
    const promo = { id: "p1", discount_type: "percent", discount_value: 20 };
    const result = applyPromoToPrice(100, promo);
    expect(result.finalPrice).toBe(80);
    expect(result.discountAmount).toBe(20);
    expect(result.promotionId).toBe("p1");
  });

  it("finalPrice مش بتبقى سالبة", () => {
    const promo = { id: "p2", discount_type: "fixed", discount_value: 500 };
    const result = applyPromoToPrice(100, promo);
    expect(result.finalPrice).toBe(0);
  });

  it("يحفظ الـ promotionId صح", () => {
    const promo = { id: "promo-abc", discount_type: "percent", discount_value: 10 };
    const result = applyPromoToPrice(50, promo);
    expect(result.promotionId).toBe("promo-abc");
  });
});
