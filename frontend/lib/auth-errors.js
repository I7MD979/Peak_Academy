const AUTH_ERROR_MESSAGES = {
  invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  email_not_confirmed: "يجب تأكيد البريد الإلكتروني أولاً. راجع بريدك أو تواصل مع الدعم.",
  user_not_found: "لا يوجد حساب بهذا البريد الإلكتروني",
  too_many_requests: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى"
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
  return message;
}
