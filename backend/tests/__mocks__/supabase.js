import { vi } from "vitest";

export const createMockBuilder = (returnValue = { data: null, error: null, count: 0 }) => {
  const builder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    single: vi.fn().mockResolvedValue(returnValue),
    count: vi.fn().mockReturnThis(),
    head: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    then(onFulfilled, onRejected) {
      return Promise.resolve(returnValue).then(onFulfilled, onRejected);
    }
  };
  return builder;
};

export const supabase = {
  from: vi.fn(() => createMockBuilder()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
};
