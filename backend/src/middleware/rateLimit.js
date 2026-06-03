import { rateLimit } from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";
const disabled =
  process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 120 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disabled || !isProduction,
  message: {
    success: false,
    error: "طلبات كثيرة — انتظر قليلًا ثم أعد المحاولة"
  }
});
