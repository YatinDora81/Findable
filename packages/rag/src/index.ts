export {
  chunk,
  looksLikeProse,
  tok,
  CHUNK_CONFIG,
  type Chunk,
  type ChunkConfig,
} from "./chunking/chunker.ts";

export {
  buildDocText,
  buildQueryText,
  embedMany,
  embedOne,
} from "./embedding/embedder.ts";

export { keyRingStatus } from "./gemini/key-ring.ts";

export { extractFromUrl, type ExtractedDocument } from "./extraction/url.ts";

export { retrieve, type Hit } from "./retrieval/retriever.ts";

export { answer, type Answer } from "./generation/answerer.ts";

export {
  collectionName,
  collectionReady,
  countBySource,
  deleteBySource,
  deleteByUser,
  searchChunks,
  upsertChunks,
  vectorSize,
  type PointInput,
  type VectorHit,
} from "./vector/repository.ts";
