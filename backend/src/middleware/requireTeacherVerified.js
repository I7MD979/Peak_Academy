import { error } from "../utils/response.js";

/** Blocks teachers until admin approves identity verification. */
export function requireTeacherVerified(req, res, next) {
  if (req.user?.role === "teacher" && req.user.verification_status !== "verified") {
    const message =
      req.user.verification_status === "pending_review"
        ? "حسابك قيد المراجعة — انتظر اعتماد الإدارة قبل إنشاء الجلسات أو دخول غرف الطلبة"
        : "يجب اعتماد حسابك من الإدارة قبل إنشاء الجلسات أو دخول غرف الطلبة";
    return error(res, message, 403, null, "TEACHER_NOT_VERIFIED");
  }
  return next();
}
