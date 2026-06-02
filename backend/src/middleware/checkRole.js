export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "غير مصرح لك بهذا الإجراء"
      });
    }
    next();
  };
};
