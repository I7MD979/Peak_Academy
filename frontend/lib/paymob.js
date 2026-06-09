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
    try {
      const payload = await paymentsApi.transactionStatus(transactionId);
      const tx = payload?.data?.transaction;

      if (tx?.status === "completed") {
        if (kind === "question" && payload?.data?.question_created) return true;
        if (kind === "session" && payload?.data?.enrolled) return true;
        if (kind === "subscription" && payload?.data?.subscription_activated) return true;
      }

      if (tx?.status === "failed") return false;
    } catch (err) {
      if (err?.status === 404) return false;
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

/** Poll V2 payments table (create-order flow) until subscription is active. */
export const pollPaymentOrderFulfillment = async (
  paymentId,
  { maxAttempts = 12, intervalMs = 2500 } = {}
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const sync = attempt === 0;
      const payload = await paymentsApi.orderStatus(paymentId, { sync });
      if (payload?.data?.subscription_activated) return true;
      if (payload?.data?.enrolled) return true;
    } catch (err) {
      if (err?.status === 404) return false;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
};
