import { describe, it, expect } from "vitest";
import { calculateRefundAmount } from "../../src/utils/refundCalculator.js";

describe("calculateRefundAmount", () => {
  const payment = { amount: 100 };

  it("إلغاء المدرس → refund كامل", () => {
    const session = { scheduled_at: new Date(Date.now() + 3600000).toISOString() };
    const result = calculateRefundAmount(payment, session, new Date(), { teacherCancelled: true });
    expect(result).toBe(100);
  });

  it("session status cancelled → refund كامل", () => {
    const session = {
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      status: "cancelled"
    };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(100);
  });

  it("إلغاء قبل 25 ساعة → refund كامل", () => {
    const sessionStart = new Date(Date.now() + 25 * 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(100);
  });

  it("إلغاء بالظبط 24 ساعة قبل → refund كامل (boundary)", () => {
    const sessionStart = new Date(Date.now() + 24 * 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(100);
  });

  it("إلغاء قبل 12 ساعة → 50% refund", () => {
    const sessionStart = new Date(Date.now() + 12 * 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(50);
  });

  it("إلغاء بالظبط ساعتين قبل → 50% refund (boundary)", () => {
    const sessionStart = new Date(Date.now() + 2 * 3600 * 1000 + 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(50);
  });

  it("إلغاء قبل ساعة واحدة → 0 refund", () => {
    const sessionStart = new Date(Date.now() + 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(0);
  });

  it("إلغاء بعد بدء الجلسة → 0 refund", () => {
    const sessionStart = new Date(Date.now() - 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(0);
  });

  it("session بدون scheduled_at → 0 refund", () => {
    const result = calculateRefundAmount(payment, {}, new Date());
    expect(result).toBe(0);
  });

  it("payment amount صفر → refund صفر", () => {
    const sessionStart = new Date(Date.now() + 30 * 3600 * 1000);
    const session = { scheduled_at: sessionStart.toISOString() };
    const result = calculateRefundAmount({ amount: 0 }, session, new Date());
    expect(result).toBe(0);
  });

  it("يستخدم start_time لو scheduled_at مش موجود", () => {
    const sessionStart = new Date(Date.now() + 30 * 3600 * 1000);
    const session = { start_time: sessionStart.toISOString() };
    const result = calculateRefundAmount(payment, session, new Date());
    expect(result).toBe(100);
  });
});
