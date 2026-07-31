import type { Job } from "bullmq";
import { env } from "@repo/config";
import { AppError, isAppError } from "@repo/contracts";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import type { IngestJobData, IngestJobResult } from "@repo/queue";
import {
  buildDocText,
  chunk,
  deleteBySource,
  embedMany,
  extractFromUrl,
  looksLikeProse,
  upsertChunks,
  type ExtractedDocument,
} from "@repo/rag";

const MIN_EXTRACTED_CHARS = 200;

const log = createLogger("ingest");

export async function processIngest(
  job: Job<IngestJobData, IngestJobResult>,
): Promise<IngestJobResult> {
  const { sourceId, requestId } = job.data;
  const jobLog = log.child({ requestId, sourceId, jobId: job.id });
  const startedAt = Date.now();

  const source = await db.source.findUniqueOrThrow({ where: { id: sourceId } });

  try {
    await db.source.update({
      where: { id: sourceId },
      data: { indexStatus: "PROCESSING", errorCode: null, errorMessage: null },
    });

    const doc: ExtractedDocument =
      source.kind === "LINK" && source.url
        ? await extractFromUrl(source.url)
        : { title: source.title, markdown: source.rawText, meta: {} };

    if (source.kind === "LINK") assertReadable(doc.markdown);

    const chunks = chunk(doc.markdown);

    if (chunks.length === 0) {
      throw new AppError("NO_CHUNKS", "Could not split this content");
    }

    jobLog.info({ chunkCount: chunks.length }, "ingest.chunked");

    await deleteBySource(sourceId);
    await db.chunk.deleteMany({ where: { sourceId } });

    const rows = await db.chunk.createManyAndReturn({
      data: chunks.map((piece, position) => ({
        sourceId,
        position,
        text: piece.text,
        tokenCount: piece.tokens,
        startOffset: piece.start,
        endOffset: piece.end,
        headingPath: piece.headingPath,
      })),
    });

    const ordered = [...rows].sort((left, right) => left.position - right.position);

    const vectors = await embedMany(
      ordered.map((row) => buildDocText(doc.title, row.headingPath, row.text)),
    );

    if (vectors.length !== ordered.length) {
      throw new AppError(
        "UPSTREAM_ERROR",
        "Embedding count did not match the chunk count",
      );
    }

    await upsertChunks(
      ordered.map((row, index) => ({
        id: row.id,
        vector: vectors[index] as number[],
        userId: source.userId,
        sourceId,
        position: row.position,
        kind: source.kind,
        text: row.text,
      })),
    );

    await db.chunk.updateMany({
      where: { sourceId },
      data: { embeddedAt: new Date() },
    });

    await db.source.update({
      where: { id: sourceId },
      data: {
        indexStatus: "READY",
        rawText: doc.markdown,
        title: doc.title || source.title,
        chunkCount: ordered.length,
        tokenCount: ordered.reduce((total, row) => total + row.tokenCount, 0),
        metadata: doc.meta as never,
        embeddingModel: env.EMBEDDING_MODEL,
        errorCode: null,
        errorMessage: null,
        indexedAt: new Date(),
      },
    });

    jobLog.info(
      { ms: Date.now() - startedAt, chunks: ordered.length },
      "ingest.complete",
    );

    return { chunkCount: ordered.length };
  } catch (error) {
    const attemptNumber = job.attemptsMade + 1;
    const totalAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = attemptNumber >= totalAttempts;
    const fatal = isAppError(error) && !error.retryable;

    jobLog.error({ err: error, attempt: attemptNumber, fatal }, "ingest.failed");

    if (isFinalAttempt || fatal) {
      await markFailed(sourceId, error);
      if (fatal) return { chunkCount: 0 };
    }

    throw error;
  }
}

function assertReadable(markdown: string): void {
  if (markdown.trim().length < MIN_EXTRACTED_CHARS) {
    throw new AppError(
      "EXTRACTION_EMPTY",
      "Nothing readable found, the page may be paywalled",
    );
  }

  if (!looksLikeProse(markdown)) {
    throw new AppError(
      "UNSUPPORTED_CONTENT",
      "This does not look like readable text",
    );
  }
}

async function markFailed(sourceId: string, error: unknown): Promise<void> {
  await deleteBySource(sourceId).catch(() => {});
  await db.chunk.deleteMany({ where: { sourceId } }).catch(() => {});

  await db.source
    .update({
      where: { id: sourceId },
      data: {
        indexStatus: "FAILED",
        chunkCount: 0,
        errorCode: isAppError(error) ? error.code : "INTERNAL",
        errorMessage: isAppError(error)
          ? error.publicMessage
          : "Something went wrong while indexing",
      },
    })
    .catch(() => {});
}
