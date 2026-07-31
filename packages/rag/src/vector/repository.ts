import { env } from "@repo/config";
import { COLLECTION, qdrant } from "./client.ts";

const UPSERT_BATCH = 64;

export type PointInput = {
  id: string;
  vector: number[];
  userId: string;
  sourceId: string;
  position: number;
  kind: string;
  text: string;
  headingPath: string | null;
};

export type VectorHit = {
  chunkId: string;
  score: number;
  text: string;
  position: number;
  headingPath: string | null;
};

export async function upsertChunks(points: PointInput[]): Promise<void> {
  for (const batch of batched(points, UPSERT_BATCH)) {
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: batch.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: {
          userId: point.userId,
          sourceId: point.sourceId,
          position: point.position,
          kind: point.kind,
          text: point.text,
          headingPath: point.headingPath,
        },
      })),
    });
  }
}

export async function deleteBySource(sourceId: string): Promise<void> {
  await qdrant.delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: "sourceId", match: { value: sourceId } }] },
  });
}

export async function deleteByUser(userId: string): Promise<void> {
  await qdrant.delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: "userId", match: { value: userId } }] },
  });
}

export async function countBySource(sourceId: string): Promise<number> {
  const result = await qdrant.count(COLLECTION, {
    exact: true,
    filter: { must: [{ key: "sourceId", match: { value: sourceId } }] },
  });

  return result.count;
}

export async function searchChunks(opts: {
  vector: number[];
  userId: string;
  sourceId: string;
  topK: number;
  scoreThreshold: number;
}): Promise<VectorHit[]> {
  const response = await qdrant.query(COLLECTION, {
    query: opts.vector,
    limit: opts.topK,
    filter: {
      must: [
        { key: "userId", match: { value: opts.userId } },
        { key: "sourceId", match: { value: opts.sourceId } },
      ],
    },
    with_payload: true,
    score_threshold: opts.scoreThreshold,
    params: { hnsw_ef: 128 },
  });

  return response.points.map((point) => {
    const payload = (point.payload ?? {}) as Record<string, unknown>;

    return {
      chunkId: String(point.id),
      score: point.score,
      text: typeof payload.text === "string" ? payload.text : "",
      position: typeof payload.position === "number" ? payload.position : 0,
      headingPath:
        typeof payload.headingPath === "string" ? payload.headingPath : null,
    };
  });
}

export async function collectionReady(): Promise<boolean> {
  const result = await qdrant.collectionExists(COLLECTION);
  return result.exists;
}

export const collectionName = COLLECTION;
export const vectorSize = env.EMBEDDING_DIMENSIONS;

function batched<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
