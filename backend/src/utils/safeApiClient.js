/**
 * Safe External API Client
 * OWASP API10:2023 — Unsafe Consumption of APIs
 */

import { z } from "zod";

const DEFAULT_TIMEOUT = 15_000;
const MAX_RESPONSE_SIZE = 1024 * 1024;

const circuitState = new Map();
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 60_000;

function getCircuit(name) {
  if (!circuitState.has(name)) {
    circuitState.set(name, { failures: 0, openedAt: null });
  }
  return circuitState.get(name);
}

function isCircuitOpen(name) {
  const circuit = getCircuit(name);
  if (circuit.failures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() - circuit.openedAt > CIRCUIT_RESET_MS) {
    circuit.failures = 0;
    circuit.openedAt = null;
    return false;
  }
  return true;
}

function recordFailure(name) {
  const circuit = getCircuit(name);
  circuit.failures++;
  if (circuit.failures >= CIRCUIT_THRESHOLD) {
    circuit.openedAt = Date.now();
    console.error(`[circuit-breaker] ${name} circuit OPENED after ${circuit.failures} failures`);
  }
}

function recordSuccess(name) {
  const circuit = getCircuit(name);
  circuit.failures = Math.max(0, circuit.failures - 1);
}

export async function safeFetch(serviceName, url, options = {}, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT, responseSchema = null, maxSize = MAX_RESPONSE_SIZE } = opts;

  validateExternalUrl(url);

  if (isCircuitOpen(serviceName)) {
    throw new Error(`${serviceName} service is temporarily unavailable (circuit open)`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      throw new Error(`Response too large from ${serviceName}: ${contentLength} bytes`);
    }

    const text = await response.text();
    if (text.length > maxSize) {
      throw new Error(`Response body too large from ${serviceName}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response from ${serviceName}: ${text.slice(0, 100)}`);
    }

    if (responseSchema) {
      const parsed = responseSchema.safeParse(data);
      if (!parsed.success) {
        console.error(`[api10] Schema validation failed for ${serviceName}:`, parsed.error.issues);
        throw new Error(`Unexpected response format from ${serviceName}`);
      }
      data = parsed.data;
    }

    recordSuccess(serviceName);
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      recordFailure(serviceName);
      throw new Error(`${serviceName} request timed out after ${timeout}ms`);
    }

    recordFailure(serviceName);
    throw err;
  }
}

export const paymobOrderSchema = z
  .object({
    id: z.number(),
    created_at: z.string().optional(),
    amount_cents: z.number().optional(),
    currency: z.string().optional()
  })
  .passthrough();

export const paymobPaymentKeySchema = z
  .object({
    token: z.string().min(10)
  })
  .passthrough();

export const paymobIntentionSchema = z
  .object({
    client_secret: z.string().optional(),
    id: z.union([z.string(), z.number()]),
    payment_keys: z.array(z.object({ key: z.string() }).passthrough()).optional(),
    intention_order_id: z.union([z.string(), z.number()]).optional()
  })
  .passthrough();

export const livekitRoomSchema = z
  .object({
    name: z.string(),
    sid: z.string().optional()
  })
  .passthrough();

export const paymobWebhookSchema = z
  .object({
    obj: z
      .object({
        id: z.union([z.number(), z.string()]),
        success: z.union([z.boolean(), z.string()]),
        amount_cents: z.number().positive(),
        currency: z.string(),
        order: z
          .object({
            id: z.union([z.number(), z.string()]),
            merchant_order_id: z.string().optional()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

const ALLOWED_EXTERNAL_DOMAINS = [
  "accept.paymob.com",
  "atfawry.fawrystaging.com",
  "www.atfawry.com",
  "livekit.io",
  "cloud.livekit.io"
];

export function validateExternalUrl(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;

  if (!ALLOWED_EXTERNAL_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    throw new Error(`External URL not in allowlist: ${hostname}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`External URL must use HTTPS: ${url}`);
  }

  return true;
}
