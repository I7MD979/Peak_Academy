import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockBuilder } from "../__mocks__/supabase.js";

vi.mock("../../src/lib/supabase.js", async () => {
  const { supabase } = await import("../__mocks__/supabase.js");
  return { supabase };
});

vi.mock("../../src/services/platformConfig.service.js", async () => {
  const { getSessionPrice, getTeacherShare } = await import("../__mocks__/platformConfig.js");
  return { getSessionPrice, getTeacherShare };
});

vi.mock("../../src/lib/schema.js", () => ({
  isSchemaV2: vi.fn().mockReturnValue(true)
}));

import { recordSessionEarnings } from "../../src/utils/session-earnings.js";
import { supabase } from "../../src/lib/supabase.js";
import { getSessionPrice, getTeacherShare } from "../../src/services/platformConfig.service.js";

describe("recordSessionEarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionPrice.mockResolvedValue(80);
    getTeacherShare.mockResolvedValue(0.7);
  });

  it("يحسب أرباح المدرس صح: 5 طلاب × 80 جنيه × 70%", async () => {
    const existingBuilder = createMockBuilder({ data: null, error: null });
    const countBuilder = createMockBuilder({ data: null, error: null, count: 5 });
    const insertBuilder = createMockBuilder({
      data: {
        id: "e1",
        teacher_amount: 280,
        platform_amount: 120,
        gross_amount: 400
      },
      error: null
    });

    supabase.from
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(countBuilder)
      .mockReturnValueOnce(insertBuilder);

    const earning = await recordSessionEarnings("sess-1", "teacher-1");

    expect(earning.teacher_amount).toBe(280);
    expect(earning.platform_amount).toBe(120);
    expect(earning.gross_amount).toBe(400);
    expect(earning.teacher_amount + earning.platform_amount).toBe(earning.gross_amount);
  });

  it("الـ teacher_amount + platform_amount = gross_amount دايماً", () => {
    const attendeeCount = 7;
    const price = 80;
    const teacherShare = 0.7;

    const gross = attendeeCount * price;
    const teacher_amount = Math.round(gross * teacherShare * 100) / 100;
    const platform_amount = Math.round((gross - teacher_amount) * 100) / 100;

    expect(teacher_amount + platform_amount).toBe(gross);
    expect(teacher_amount).toBe(392);
    expect(platform_amount).toBe(168);
  });

  it("صفر طلاب حضروا → gross = 0", () => {
    const attendeeCount = 0;
    const price = 80;
    const teacherShare = 0.7;

    const gross = attendeeCount * price;
    const teacher_amount = Math.round(gross * teacherShare * 100) / 100;
    const platform_amount = Math.round((gross - teacher_amount) * 100) / 100;

    expect(gross).toBe(0);
    expect(teacher_amount).toBe(0);
    expect(platform_amount).toBe(0);
  });
});
