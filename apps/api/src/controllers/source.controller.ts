import type { Request, Response } from "express";
import {
  AppError,
  createSourceSchema,
  listSourcesSchema,
  sourceIdSchema,
} from "@repo/contracts";
import { db } from "@repo/db";
import { enqueueIngest, isIngestPending } from "@repo/queue";
import { deleteBySource } from "@repo/rag";
import { canonicalizeUrl, normalizeText, sha256 } from "../lib/hash.ts";

const SOURCE_SUMMARY = {
  id: true,
  userId: true,
  title: true,
  kind: true,
  indexStatus: true,
  url: true,
  chunkCount: true,
  tokenCount: true,
  embeddingModel: true,
  errorCode: true,
  errorMessage: true,
  indexedAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  lastAskedAt: true,
} as const;

export async function createSource(req: Request, res: Response): Promise<void> {
  const body = createSourceSchema.parse(req.body);
  const userId = req.userId;

  const contentHash =
    body.type === "text"
      ? sha256(normalizeText(body.content))
      : sha256(canonicalizeUrl(body.url));

  const duplicate = await db.source.findUnique({
    where: { userId_contentHash: { userId, contentHash } },
  });

  if (duplicate) {
    throw new AppError("DUPLICATE_SOURCE", "You already saved this", {
      id: duplicate.id,
    });
  }

  const source = await db.source.create({
    data: {
      userId,
      kind: body.type === "link" ? "LINK" : "TEXT",
      title: body.type === "text" ? (body.title ?? "Untitled note") : body.url,
      url: body.type === "link" ? body.url : null,
      rawText: body.type === "text" ? body.content : "",
      contentHash,
      indexStatus: "PENDING",
    },
  });

  const outcome = await enqueueIngest({
    sourceId: source.id,
    userId,
    requestId: req.id,
  });

  req.log.info(
    { sourceId: source.id, kind: source.kind, outcome },
    "ingest.queued",
  );

  res.status(202).json({ data: source });
}

export async function listSources(req: Request, res: Response): Promise<void> {
  const { status, cursor, limit } = listSourcesSchema.parse(req.query);

  const sources = await db.source.findMany({
    where: { userId: req.userId, ...(status ? { indexStatus: status } : {}) },
    select: SOURCE_SUMMARY,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = sources.length > limit;
  const page = hasMore ? sources.slice(0, limit) : sources;

  res.json({
    data: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  });
}

export async function getSource(req: Request, res: Response): Promise<void> {
  const { id } = sourceIdSchema.parse(req.params);

  const source = await db.source.findFirst({
    where: { id, userId: req.userId },
    select: SOURCE_SUMMARY,
  });

  if (!source) throw new AppError("NOT_FOUND", "Source not found");

  res.json({ data: source });
}

export async function deleteSource(req: Request, res: Response): Promise<void> {
  const { id } = sourceIdSchema.parse(req.params);

  const source = await db.source.findFirst({
    where: { id, userId: req.userId },
    select: { id: true },
  });

  if (!source) throw new AppError("NOT_FOUND", "Source not found");

  await db.source.delete({ where: { id } });

  await deleteBySource(id).catch((error: unknown) => {
    req.log.error({ err: error, sourceId: id }, "source.vectors.orphaned");
  });

  req.log.info({ sourceId: id }, "source.deleted");

  res.status(204).end();
}

export async function reindexSource(req: Request, res: Response): Promise<void> {
  const { id } = sourceIdSchema.parse(req.params);

  const source = await db.source.findFirst({
    where: { id, userId: req.userId },
    select: { id: true, indexStatus: true },
  });

  if (!source) throw new AppError("NOT_FOUND", "Source not found");

  if (source.indexStatus === "PROCESSING" && (await isIngestPending(id))) {
    throw new AppError("SOURCE_NOT_READY", "This source is already being indexed");
  }

  const outcome = await enqueueIngest({
    sourceId: id,
    userId: req.userId,
    requestId: req.id,
  });

  if (outcome === "already-queued") {
    throw new AppError("SOURCE_NOT_READY", "This source is already queued");
  }

  const updated = await db.source.update({
    where: { id },
    data: {
      indexStatus: "PENDING",
      errorCode: null,
      errorMessage: null,
    },
    select: SOURCE_SUMMARY,
  });

  req.log.info({ sourceId: id, outcome }, "reindex.queued");

  res.status(202).json({ data: updated });
}
