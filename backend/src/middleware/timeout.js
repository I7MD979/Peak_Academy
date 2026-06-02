export const timeout = (req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ success: false, error: "Request timeout" });
  });
  next();
};
