export function isTeacherVerified(verificationStatus) {
  return verificationStatus === "verified";
}

/** Blocks creating sessions, starting/joining live, and entering student study rooms. */
export function getTeacherTeachingGate(verificationStatus) {
  if (isTeacherVerified(verificationStatus)) {
    return { allowed: true, reason: "" };
  }

  if (verificationStatus === "pending_review") {
    return {
      allowed: false,
      reason:
        "حسابك قيد المراجعة — انتظر اعتماد الإدارة قبل إنشاء الجلسات أو دخول غرف الطلبة"
    };
  }

  if (verificationStatus === "rejected") {
    return {
      allowed: false,
      reason: "أعد رفع مستندات التحقق من صفحة التحقق قبل متابعة التدريس"
    };
  }

  return {
    allowed: false,
    reason: "وثّق هويتك كمدرس قبل إنشاء الجلسات أو دخول غرف الطلبة"
  };
}
