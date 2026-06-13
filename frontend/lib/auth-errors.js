const AUTH_ERROR_MESSAGES = {
  invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  email_not_confirmed: "يجب تأكيد البريد الإلكتروني أولاً. راجع بريدك أو تواصل مع الدعم.",
  user_not_found: "لا يوجد حساب بهذا البريد الإلكتروني",
  too_many_requests: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى",
  weak_password: "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.",
  email_exists: "هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.",
  oauth_failed: "تعذر تسجيل الدخول عبر Google. حاول مرة أخرى."
};

export function getAuthErrorMessage(error) {
  if (!error) return "";
  const code = error.code || error.error_code;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  const message = error.message || "";
  if (message.toLowerCase().includes("invalid login credentials")) {
    return AUTH_ERROR_MESSAGES.invalid_credentials;
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return AUTH_ERROR_MESSAGES.email_not_confirmed;
  }
  if (message.toLowerCase().includes("user already registered")) {
    return AUTH_ERROR_MESSAGES.email_exists;
  }
  if (message.toLowerCase().includes("password should be at least")) {
    return AUTH_ERROR_MESSAGES.weak_password;
  }
  if (
    error.status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("too many requests")
  ) {
    return AUTH_ERROR_MESSAGES.too_many_requests;
  }
  return message;
}
