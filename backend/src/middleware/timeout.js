export const timeout = (req, res, next) => {
  const path = req.originalUrl || req.url || "";
  if (path.includes("/notifications/stream") || path.includes("/payments/webhook")) {
    return next();
  }

  req.setTimeout(30_000, () => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, error: "انتهت مهلة الطلب" });
    }
  });

  next();
};
