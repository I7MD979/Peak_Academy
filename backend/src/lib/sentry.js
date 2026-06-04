import { isEnabled } from "../utils/featureFlags.js";

let sentry = null;

export async function initSentry() {
  if (!isEnabled("FF_SENTRY_ENABLED") || !process.env.SENTRY_DSN) return null;
  if (sentry) return sentry;

  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
      integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()]
    });
    sentry = Sentry;
    console.log("Sentry initialized");
    return sentry;
  } catch (error) {
    console.warn("Sentry init skipped:", error.message);
    return null;
  }
}

export function captureException(error, context = {}) {
  if (sentry) sentry.captureException(error, { extra: context });
}

export function setupExpressSentry(app) {
  if (!sentry || !app) return;
  try {
    sentry.setupExpressErrorHandler(app);
  } catch (error) {
    console.warn("Sentry Express error handler skipped:", error.message);
  }
}
