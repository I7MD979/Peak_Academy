import { paymentsApi } from "./api";

export const initiatePayment = async (amount, sessionId) => {
  const payload = await paymentsApi.initiate(amount, sessionId);
  return payload?.data?.checkout_url;
};

export const initiateQuestionPayment = async (amount, { subject, content, grade }) => {
  const payload = await paymentsApi.initiateQuestion(amount, { subject, content, grade });
  return payload?.data?.checkout_url;
};
