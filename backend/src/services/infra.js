const { isEnabled } = require("../utils/featureFlags");

let sentry = null;
let redisClient = null;
let queue = null;

function initSentry() {
  if (!isEnabled("FF_SENTRY_ENABLED") || !process.env.SENTRY_DSN) return null;
  try {
    // Lazy-loaded to keep local dev lightweight when flag is off.
    const Sentry = require("@sentry/node");
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
    sentry = Sentry;
    return Sentry;
  } catch (error) {
    console.warn("Sentry init skipped:", error.message);
    return null;
  }
}

function initQueue() {
  if (!isEnabled("FF_REDIS_QUEUE_ENABLED") || !process.env.REDIS_URL) return null;
  try {
    const { Queue } = require("bullmq");
    const IORedis = require("ioredis");
    redisClient = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue("peak-jobs", { connection: redisClient });
    return queue;
  } catch (error) {
    console.warn("Queue init skipped:", error.message);
    return null;
  }
}

async function enqueueJob(name, payload) {
  if (!queue) return { enqueued: false, reason: "queue_disabled" };
  const job = await queue.add(name, payload);
  return { enqueued: true, job_id: job.id };
}

function captureException(error, context) {
  if (sentry) sentry.captureException(error, { extra: context });
}

module.exports = { initSentry, initQueue, enqueueJob, captureException };
