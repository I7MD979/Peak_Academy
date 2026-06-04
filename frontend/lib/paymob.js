import { paymentsApi, sessionsApi } from "./api";

export const initiatePayment = async (amount, sessionId) => {
  const payload = await paymentsApi.initiate(amount, sessionId);
  return {
    checkoutUrl: payload?.data?.checkout_url,
    transactionId: payload?.data?.transaction_id
  };
};

export const initiateQuestionPayment = async (amount, { subject, content, grade }) => {
  const payload = await paymentsApi.initiateQuestion(amount, { subject, content, grade });
  return {
    checkoutUrl: payload?.data?.checkout_url,
    transactionId: payload?.data?.transaction_id
  };
};

export const pollTransactionFulfillment = async (
  transactionId,
  { kind = "session", maxAttempts = 12, intervalMs = 2500, sessionId = null } = {}
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const payload = await paymentsApi.transactionStatus(transactionId);
    const tx = payload?.data?.transaction;

    if (tx?.status === "completed") {
      if (kind === "question" && payload?.data?.question_created) {
        return true;
      }
      if (kind === "session" && payload?.data?.enrolled) {
        return true;
      }
    }

    if (tx?.status === "failed") {
      return false;
    }

    if (tx?.status === "completed") {
      // Webhook received; enrollment/question creation may lag one poll cycle.
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  if (kind === "session" && sessionId) {
    try {
      await sessionsApi.enroll(sessionId, { payment_id: transactionId });
      return true;
    } catch {
      return false;
    }
  }

  return false;
};

/** @deprecated use pollTransactionFulfillment */
export const pollTransactionEnrollment = (transactionId, options = {}) =>
  pollTransactionFulfillment(transactionId, { ...options, kind: "session" });

export const pollQuestionPayment = (transactionId, options = {}) =>
  pollTransactionFulfillment(transactionId, { ...options, kind: "question" });
