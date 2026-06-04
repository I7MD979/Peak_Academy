import { isEnabled } from "../utils/featureFlags.js";
import {
  handleEmailJob,
  handleNotificationJob,
  handleReportJob
} from "../queues/handlers.js";
import { captureException } from "./sentry.js";

const queues = {};
const workers = [];
let connection = null;

async function getConnection() {
  if (connection) return connection;
  if (!process.env.REDIS_URL) return null;

  const IORedis = (await import("ioredis")).default;
  connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  return connection;
}

async function getQueue(name) {
  if (queues[name]) return queues[name];
  const conn = await getConnection();
  if (!conn) return null;

  const { Queue } = await import("bullmq");
  queues[name] = new Queue(name, { connection: conn });
  return queues[name];
}

export async function enqueueJob(queueName, jobName, payload) {
  if (arguments.length === 2 && typeof jobName === "object") {
    return enqueueJob("peak-jobs", queueName, jobName);
  }

  if (!isEnabled("FF_REDIS_QUEUE_ENABLED")) {
    return processInline(queueName, jobName, payload);
  }

  const queue = await getQueue(queueName);
  if (!queue) {
    return processInline(queueName, jobName, payload);
  }

  const job = await queue.add(jobName, payload, {
    removeOnComplete: 100,
    removeOnFail: 200
  });
  return { enqueued: true, job_id: job.id, queue: queueName };
}

async function processInline(queueName, jobName, payload) {
  try {
    const result = await runJob(queueName, jobName, payload);
    return { enqueued: false, processed_inline: true, result };
  } catch (error) {
    captureException(error, { queueName, jobName, payload });
    return { enqueued: false, processed_inline: true, error: error.message };
  }
}

async function runJob(queueName, jobName, payload) {
  if (queueName === "email") return handleEmailJob(jobName, payload);
  if (queueName === "reports") return handleReportJob(jobName, payload);
  if (queueName === "notifications") return handleNotificationJob(jobName, payload);
  return { skipped: true, reason: "unknown_queue" };
}

export async function startWorkers() {
  if (!isEnabled("FF_REDIS_QUEUE_ENABLED") || !process.env.REDIS_URL) {
    console.log("Queue workers skipped (FF_REDIS_QUEUE_ENABLED or REDIS_URL not set)");
    return [];
  }

  const conn = await getConnection();
  if (!conn) return [];

  const { Worker } = await import("bullmq");
  const specs = [
    { name: "email", handler: handleEmailJob },
    { name: "reports", handler: handleReportJob },
    { name: "notifications", handler: handleNotificationJob }
  ];

  for (const spec of specs) {
    const worker = new Worker(
      spec.name,
      async (job) => spec.handler(job.name, job.data),
      { connection: conn, concurrency: 3 }
    );

    worker.on("failed", (job, error) => {
      captureException(error, { queue: spec.name, job: job?.name, jobId: job?.id });
    });

    workers.push(worker);
    console.log(`Queue worker started: ${spec.name}`);
  }

  return workers;
}

export async function shutdownWorkers() {
  await Promise.all(workers.map((worker) => worker.close()));
  workers.length = 0;
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
