// Backward-compatible re-exports — prefer lib/queue.js and lib/sentry.js
export { enqueueJob, startWorkers, shutdownWorkers } from "../lib/queue.js";
export { initSentry, captureException } from "../lib/sentry.js";

/** @deprecated use enqueueJob(queueName, jobName, payload) */
export async function enqueueLegacyJob(name, payload) {
  const { enqueueJob } = await import("../lib/queue.js");
  return enqueueJob("peak-jobs", name, payload);
}
