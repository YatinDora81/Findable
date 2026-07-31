import { Worker } from "bullmq";
import { env } from "@repo/config";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import {
  closeConnection,
  connection,
  INGEST_QUEUE,
  type IngestJobData,
  type IngestJobResult,
  type IngestJobName,
} from "@repo/queue";
import { startHealthServer } from "./health-server.ts";
import { processIngest } from "./processors/ingest.processor.ts";

const log = createLogger("worker");

const healthServer = startHealthServer();

const worker = new Worker<IngestJobData, IngestJobResult, IngestJobName>(
  INGEST_QUEUE,
  processIngest,
  { connection, concurrency: env.INGEST_CONCURRENCY },
);

worker.on("completed", (job, result) => {
  log.info({ jobId: job.id, chunkCount: result.chunkCount }, "job.completed");
});

worker.on("failed", (job, error) => {
  log.error(
    { jobId: job?.id, attemptsMade: job?.attemptsMade, err: error },
    "job.failed",
  );
});

worker.on("error", (error) => {
  log.error({ err: error }, "worker.error");
});

log.info(
  { queue: INGEST_QUEUE, concurrency: env.INGEST_CONCURRENCY },
  "worker.started",
);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info({ signal }, "worker.shutdown");

  await healthServer.stop(true);
  await worker.close();
  await closeConnection();
  await db.$disconnect();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
