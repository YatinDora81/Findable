import pLimit from "p-limit";
import { env } from "@repo/config";
import { AppError } from "@repo/contracts";
import { callGemini } from "../gemini/key-ring.ts";

const BATCH_SIZE = 32;

const limit = pLimit(4);

export function buildDocText(
  title: string,
  headingPath: string | null,
  text: string,
): string {
  const label = !headingPath
    ? title
    : headingPath.startsWith(title)
      ? headingPath
      : `${title} > ${headingPath}`;

  return `title: ${label} | text: ${text}`;
}

export const buildQueryText = (question: string): string =>
  `task: question answering | query: ${question}`;

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batches = batched(texts, BATCH_SIZE);
  const results = await Promise.all(
    batches.map((batch) => limit(() => embedBatch(batch))),
  );

  return results.flat();
}

export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);

  if (!vector) {
    throw new AppError("UPSTREAM_ERROR", "Embedding request returned no vector");
  }

  return vector;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await callGemini("embedding content", (client) =>
    client.models.embedContent({
      model: env.EMBEDDING_MODEL,
      contents: texts.map((text) => ({ role: "user", parts: [{ text }] })),
      config: { outputDimensionality: env.EMBEDDING_DIMENSIONS },
    }),
  );

  const embeddings = response.embeddings ?? [];

  if (embeddings.length !== texts.length) {
    throw new AppError(
      "UPSTREAM_ERROR",
      `Embedding count mismatch: asked for ${texts.length}, received ${embeddings.length}`,
    );
  }

  return embeddings.map((embedding, index) => {
    const values = embedding.values;

    if (!values || values.length !== env.EMBEDDING_DIMENSIONS) {
      throw new AppError(
        "UPSTREAM_ERROR",
        `Embedding ${index} has ${values?.length ?? 0} dimensions, expected ${env.EMBEDDING_DIMENSIONS}`,
      );
    }

    return normalize(values);
  });
}

function normalize(vector: number[]): number[] {
  let sumOfSquares = 0;
  for (const value of vector) sumOfSquares += value * value;

  const magnitude = Math.sqrt(sumOfSquares);
  if (magnitude === 0 || Math.abs(magnitude - 1) < 1e-6) return vector;

  return vector.map((value) => value / magnitude);
}

function batched<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
