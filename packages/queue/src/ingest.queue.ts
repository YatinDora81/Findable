import { Queue, type JobsOptions } from "bullmq";
import { connection, withRedisTimeout } from "./connection.ts";

export const INGEST_QUEUE = "ingest";

const ENQUEUE_TIMEOUT_MS = 5_000;
const COUNTS_TIMEOUT_MS = 2_000;

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

export function enqueueIngest(
  data: IngestJobData,
): Promise<EnqueueOutcome> {
  return withRedisTimeout("enqueue", ENQUEUE_TIMEOUT_MS, async () => {
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
  });
}

export async function ingestJobCounts(): Promise<Record<string, number> | null> {
  try {
    return await withRedisTimeout("job counts", COUNTS_TIMEOUT_MS, () =>
      ingestQueue.getJobCounts("active", "waiting", "delayed", "failed"),
    );
  } catch {
    return null;
  }
}

export async function isIngestPending(sourceId: string): Promise<boolean> {
  try {
    return await withRedisTimeout("job lookup", COUNTS_TIMEOUT_MS, async () => {
      const job = await ingestQueue.getJob(sourceId);
      if (!job) return false;

      return PENDING_STATES.has(await job.getState());
    });
  } catch {
    return false;
  }
}

export async function closeQueue(): Promise<void> {
  await ingestQueue.close();
}
