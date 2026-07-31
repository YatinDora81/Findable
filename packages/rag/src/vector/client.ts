import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@repo/config";

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  checkCompatibility: false,
});

export const COLLECTION = env.QDRANT_COLLECTION;
