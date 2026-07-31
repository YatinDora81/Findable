import { env } from "@repo/config";
import { COLLECTION, qdrant } from "../src/vector/client.ts";

const existing = await qdrant.collectionExists(COLLECTION);

if (existing.exists) {
  const info = await qdrant.getCollection(COLLECTION);
  console.log(`${COLLECTION} already exists with ${info.points_count ?? 0} points`);
  process.exit(0);
}

await qdrant.createCollection(COLLECTION, {
  vectors: { size: env.EMBEDDING_DIMENSIONS, distance: "Cosine" },
  hnsw_config: { m: 0, payload_m: 16 },
  on_disk_payload: true,
});

await qdrant.createPayloadIndex(COLLECTION, {
  wait: true,
  field_name: "userId",
  field_schema: { type: "keyword", is_tenant: true },
});

await qdrant.createPayloadIndex(COLLECTION, {
  wait: true,
  field_name: "sourceId",
  field_schema: "keyword",
});

console.log(`created ${COLLECTION} with ${env.EMBEDDING_DIMENSIONS} dimensions`);
