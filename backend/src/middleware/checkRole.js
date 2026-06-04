export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "غير مصرح لك بهذا الإجراء"
      });
    }
    next();
  };
};
