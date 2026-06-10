import { vi } from "vitest";

export const getSessionPrice = vi.fn().mockResolvedValue(80);
export const getTeacherShare = vi.fn().mockResolvedValue(0.7);
