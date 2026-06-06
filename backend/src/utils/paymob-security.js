/**
 * Paymob Payment Security
 * OWASP A08 (Data Integrity) | PCI DSS
 * NIST SC-28 (Protection of Information at Rest)
 */

import crypto from "crypto";
import { rateLimit } from "express-rate-limit";
import { buildPaymobHmacPayload } from "./paymob-hmac.js";

/**
 * التحقق من Paymob HMAC — OWASP A08 (timing-safe)
 */
export function verifyPaymobHmacStrict(payload, receivedHmac) {
  if (!receivedHmac || typeof receivedHmac !== "string") {
    return { valid: false, reason: "missing_hmac" };
  }

  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAYMOB_HMAC_SECRET not configured");
    }
    return { valid: false, reason: "missing_secret" };
  }

  const obj = payload?.obj || payload;
  if (!obj || typeof obj !== "object") {
    return { valid: false, reason: "missing_payload" };
  }

  const expectedHmac = crypto.createHmac("sha512", secret).update(buildPaymobHmacPayload(obj)).digest("hex");

  try {
    const receivedBuffer = Buffer.from(receivedHmac.toLowerCase(), "hex");
    const expectedBuffer = Buffer.from(expectedHmac.toLowerCase(), "hex");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: "hmac_length_mismatch" };
    }

    const isValid = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    return { valid: isValid, reason: isValid ? null : "hmac_mismatch" };
  } catch {
    return { valid: false, reason: "hmac_invalid_format" };
  }
}

export function validatePaymobTransaction(transaction) {
  const errors = [];
  const required = ["id", "success", "amount_cents", "currency", "order"];

  for (const field of required) {
    if (transaction[field] === undefined || transaction[field] === null) {
      errors.push(`missing field: ${field}`);
    }
  }

  if (transaction.currency && transaction.currency !== "EGP") {
    errors.push(`unexpected currency: ${transaction.currency}`);
  }

  const amount = Number(transaction.amount_cents);
  if (Number.isNaN(amount) || amount < 0 || amount > 100000000) {
    errors.push(`invalid amount: ${transaction.amount_cents}`);
  }

  if (transaction.is_refunded || transaction.is_voided) {
    errors.push("transaction is refunded or voided");
  }

  return { valid: errors.length === 0, errors };
}

const processedTransactions = new Set();
const TRANSACTION_TTL = 24 * 60 * 60 * 1000;

export function checkReplayAttack(transactionId) {
  const key = String(transactionId);

  if (processedTransactions.has(key)) {
    console.warn(`[paymob] replay attack detected: transaction ${key}`);
    return { isReplay: true };
  }

  processedTransactions.add(key);
  setTimeout(() => processedTransactions.delete(key), TRANSACTION_TTL);

  return { isReplay: false };
}

export async function verifyTransactionAmount(transactionAmountCents, expectedAmountCents, tolerance = 0) {
  const diff = Math.abs(transactionAmountCents - expectedAmountCents);
  if (diff > tolerance) {
    console.error(`[paymob] amount mismatch: got ${transactionAmountCents}, expected ${expectedAmountCents}`);
    return { valid: false, reason: "amount_mismatch" };
  }
  return { valid: true };
}

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: () => "paymob_webhook",
  message: { success: false, error: "Too many webhook events" },
  skip: (req) => {
    const paymobIPs = (process.env.PAYMOB_WEBHOOK_IPS || "").split(",").filter(Boolean);
    return paymobIPs.length > 0 && paymobIPs.includes(req.ip);
  }
});
