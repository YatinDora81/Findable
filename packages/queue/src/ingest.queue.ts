import { Queue, type JobsOptions } from "bullmq";
import { connection } from "./connection.ts";

export const INGEST_QUEUE = "ingest";

export type IngestJobData = {
  sourceId: string;
  userId: string;
  requestId: string;
};

export type IngestJobResult = {
  chunkCount: number;
};

export type IngestJobName = "ingest";

export type EnqueueOutcome = "queued" | "already-queued";

const PENDING_STATES = new Set([
  "active",
  "waiting",
  "waiting-children",
  "delayed",
  "prioritized",
  "paused",
]);

export const INGEST_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: true,
  removeOnFail: true,
};

export const ingestQueue = new Queue<
  IngestJobData,
  IngestJobResult,
  IngestJobName
>(INGEST_QUEUE, {
  connection,
  defaultJobOptions: INGEST_JOB_OPTIONS,
});

ingestQueue.on("error", () => {});

export async function enqueueIngest(
  data: IngestJobData,
): Promise<EnqueueOutcome> {
  const existing = await ingestQueue.getJob(data.sourceId);

  if (existing) {
    const state = await existing.getState();

    if (PENDING_STATES.has(state)) return "already-queued";

    const removed = await existing
      .remove()
      .then(() => true)
      .catch(() => false);

    if (!removed) return "already-queued";
  }

  await ingestQueue.add("ingest", data, { jobId: data.sourceId });

  return "queued";
}

export async function closeQueue(): Promise<void> {
  await ingestQueue.close();
}
