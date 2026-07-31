import { env } from "@repo/config";
import { buildQueryText, embedOne } from "../embedding/embedder.ts";
import { searchChunks, type VectorHit } from "../vector/repository.ts";

export type Hit = VectorHit;

export async function retrieve(opts: {
  userId: string;
  sourceId: string;
  question: string;
  topK?: number;
}): Promise<Hit[]> {
  const vector = await embedOne(buildQueryText(opts.question));

  return searchChunks({
    vector,
    userId: opts.userId,
    sourceId: opts.sourceId,
    topK: opts.topK ?? env.RETRIEVAL_TOP_K,
    scoreThreshold: env.SCORE_THRESHOLD,
  });
}
