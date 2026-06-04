import { rateLimit } from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";
const disabled =
  process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 120 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (disabled || !isProduction) return true;
    const path = req.originalUrl || req.url || "";
    return path.includes("/payments/webhook") || path.includes("/notifications/stream");
  },
  message: {
    success: false,
    error: "طلبات كثيرة — انتظر قليلًا ثم أعد المحاولة"
  }
});
