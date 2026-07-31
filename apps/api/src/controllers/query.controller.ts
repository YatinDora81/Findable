import type { Request, Response } from "express";
import { env } from "@repo/config";
import {
  AppError,
  listMessagesSchema,
  querySchema,
  sourceIdSchema,
} from "@repo/contracts";
import { db } from "@repo/db";
import { answer, retrieve } from "@repo/rag";

const SNIPPET_LENGTH = 300;

export async function query(req: Request, res: Response): Promise<void> {
  const { id: sourceId } = sourceIdSchema.parse(req.params);
  const { question, topK } = querySchema.parse(req.body);
  const userId = req.userId;

  const source = await db.source.findFirst({ where: { id: sourceId, userId } });

  if (!source) throw new AppError("NOT_FOUND", "Source not found");

  if (source.indexStatus === "FAILED") {
    throw new AppError(
      "SOURCE_NOT_READY",
      source.errorMessage ?? "This source failed to index, try reindexing it",
    );
  }

  if (source.indexStatus !== "READY") {
    throw new AppError("SOURCE_NOT_READY", "This source is still being indexed");
  }

  const retrievalStartedAt = Date.now();
  const hits = await retrieve({ userId, sourceId, question, topK });
  const retrievalMs = Date.now() - retrievalStartedAt;

  if (hits.length === 0) {
    const message = await db.$transaction(async (tx) => {
      await tx.message.create({
        data: { sourceId, role: "USER", content: question },
      });

      return tx.message.create({
        data: {
          sourceId,
          role: "ASSISTANT",
          retrievalMs,
          content: "I couldn't find anything in this source that answers that.",
        },
      });
    });

    req.log.info(
      { sourceId, retrieved: 0, cited: 0, retrievalMs },
      "query.complete",
    );

    res.json({
      data: {
        messageId: message.id,
        answer: message.content,
        citations: [],
        timings: { retrievalMs, generationMs: 0 },
      },
    });
    return;
  }

  const generationStartedAt = Date.now();
  const result = await answer(question, hits);
  const generationMs = Date.now() - generationStartedAt;

  const cited = new Set(result.used);

  const liveChunks = await db.chunk.findMany({
    where: { id: { in: hits.map((hit) => hit.chunkId) } },
    select: { id: true },
  });

  const live = new Set(liveChunks.map((chunk) => chunk.id));

  const message = await db.$transaction(async (tx) => {
    await tx.message.create({
      data: { sourceId, role: "USER", content: question },
    });

    const created = await tx.message.create({
      data: {
        sourceId,
        role: "ASSISTANT",
        content: result.answer,
        model: env.GENERATION_MODEL,
        retrievalMs,
        generationMs,
        promptTokens: result.usage.promptTokens ?? null,
        completionTokens: result.usage.completionTokens ?? null,
      },
    });

    await tx.citation.createMany({
      data: hits.map((hit, index) => {
        const rank = index + 1;
        const wasCited = cited.has(rank);

        return {
          messageId: created.id,
          rank,
          chunkId: live.has(hit.chunkId) ? hit.chunkId : null,
          score: hit.score,
          wasCited,
          headingPath: hit.headingPath,
          snippet: wasCited ? hit.text.slice(0, SNIPPET_LENGTH) : null,
        };
      }),
    });

    await tx.source.update({
      where: { id: sourceId },
      data: { lastAskedAt: new Date() },
    });

    return created;
  });

  req.log.info(
    {
      sourceId,
      retrieved: hits.length,
      cited: result.used.length,
      topScore: hits[0]?.score,
      hasAnswer: result.hasAnswer,
      retrievalMs,
      generationMs,
    },
    "query.complete",
  );

  res.json({
    data: {
      messageId: message.id,
      answer: result.answer,
      hasAnswer: result.hasAnswer,
      citations: result.used.map((rank) => {
        const hit = hits[rank - 1];

        return {
          rank,
          chunkId: hit?.chunkId ?? null,
          score: hit?.score ?? 0,
          headingPath: hit?.headingPath ?? null,
          snippet: hit?.text.slice(0, SNIPPET_LENGTH) ?? "",
        };
      }),
      usage: result.usage,
      timings: { retrievalMs, generationMs },
    },
  });
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const { id: sourceId } = sourceIdSchema.parse(req.params);
  const { limit } = listMessagesSchema.parse(req.query);

  const source = await db.source.findFirst({
    where: { id: sourceId, userId: req.userId },
    select: { id: true },
  });

  if (!source) throw new AppError("NOT_FOUND", "Source not found");

  const messages = await db.message.findMany({
    where: { sourceId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: {
      citations: {
        where: { wasCited: true },
        orderBy: { rank: "asc" },
      },
    },
  });

  res.json({ data: messages.reverse() });
}
