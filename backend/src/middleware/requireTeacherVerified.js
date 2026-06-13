import { error } from "../utils/response.js";

/** Blocks teachers until admin approves identity verification. */
export function requireTeacherVerified(req, res, next) {
  if (req.user?.role === "teacher" && req.user.verification_status !== "verified") {
    return error(res, "يجب اعتماد حسابك من الإدارة قبل بدء الجلسات", 403);
  }
  return next();
}
