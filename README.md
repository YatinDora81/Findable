# Findable

An AI knowledge inbox. Save a note or a link, it gets extracted, chunked, embedded and indexed, then you ask questions about it and get answers with citations back to the exact chunk they came from.

## Stack

Turborepo · Bun · Express 5 · Prisma 7 / Postgres · Qdrant · Redis + BullMQ · Gemini

| Model | Used for |
| --- | --- |
| `gemini-embedding-2` | embeddings, 1536 dims (MRL truncated from 3072) |
| `gemini-3.6-flash` | answer generation |
| `gemini-3.5-flash-lite` | utility calls |

## Layout

```
apps/
  api/        Express 5 http api
  worker/     BullMQ consumer running the ingest pipeline
  web/        Next.js app
packages/
  config/     zod validated env + gemini key ring parsing
  contracts/  zod request schemas, error codes, AppError
  db/         Prisma schema and client
  logger/     pino factory
  queue/      BullMQ queue, job types, redis connection
  rag/        chunking, embedding, vector store, extraction, retrieval, generation
```

`packages/rag` has no http dependencies. Both the api (which embeds queries) and the worker (which embeds documents) import it.

## Setup

```bash
cp .env.example .env          # fill in DATABASE_URL, QDRANT_URL, QDRANT_API_KEY, GEMINI_API_KEYS
docker compose up -d          # local redis + qdrant, skip if you use hosted ones
bun install
bun run db:generate           # the generated Prisma client is gitignored
bun run db:deploy             # or db:migrate if you are changing the schema
bun run db:seed
bun run qdrant:init
bun run dev
```

`db:generate` is the step a fresh clone forgets. `packages/db/generated/` is gitignored, so nothing typechecks or boots until it has run once. `check-types` and `build` both depend on it in `turbo.json`, so those two commands pull it in automatically — but running the api or worker directly does not.

### Environment

`GEMINI_API_KEYS` holds a rotating key ring. Each entry is `NAME__SPLIT__KEY`, entries separated by commas:

```
GEMINI_API_KEYS="alpha__SPLIT__AIza...,beta__SPLIT__AIza..."
```

The ring round robins across keys, backs a key off on 429 or 5xx, and permanently drops a key that answers 401 or 403 so one revoked key cannot fail the request. `GET /api/v1/health/ready` reports the live state of every key.

A missing or malformed variable crashes on boot with the offending field named, rather than throwing a 500 an hour later.

## API

```
POST   /api/v1/auth/guest              201  create a guest user and log in
POST   /api/v1/auth/login              200  email + password
GET    /api/v1/auth/me                 200
POST   /api/v1/auth/logout             204

POST   /api/v1/sources                 202  create and queue ingest
GET    /api/v1/sources                 200  cursor paginated
GET    /api/v1/sources/:id             200
DELETE /api/v1/sources/:id             204
POST   /api/v1/sources/:id/reindex     202

POST   /api/v1/sources/:id/query       200  ask, returns citations
GET    /api/v1/sources/:id/messages    200  history with citations

GET    /api/v1/health                  200  liveness
GET    /api/v1/health/ready            200  postgres + redis + qdrant + key ring

POST   /api/v1/ingest    -> createSource
GET    /api/v1/items     -> listSources
POST   /api/v1/query     -> query, takes projectId in the body
```

The worker runs its own tiny http server on `WORKER_PORT`, so a process manager can tell whether the consumer is alive without going through the api:

```
GET    /health                         200  liveness
GET    /health/ready                   200  redis + postgres + queue depth
```

Auth is a bearer token on every route except `/health*`, `/auth/guest` and `/auth/login`. `POST /api/v1/auth/guest` mints a user with a generated password and hands back both a session token and the credentials, so a visitor can start immediately and still sign back in later. A request with no token is rejected with 403 — there is no anonymous fallback tenant.

Every failure uses the same envelope:

```json
{
  "error": {
    "code": "EXTRACTION_EMPTY",
    "message": "Nothing readable found, the page may be paywalled",
    "details": null,
    "requestId": "01J8X..."
  }
}
```

## How ingest works

1. Mark the source `PROCESSING`.
2. Extract. A link goes through Readability then Turndown; a note is already markdown. This is the only step where `TEXT` and `LINK` differ.
3. Guard. Link extractions must clear a length floor and look like prose, which rejects paywall stubs, base64 blobs and minified bundles. Notes skip this because the user typed them on purpose.
4. Chunk. Markdown aware, splits on headings then paragraphs then sentences, 450 token target with 60 token overlap, and merges runts so a 20 token orphan does not become a vector that matches everything weakly.
5. Wipe the previous attempt, Qdrant first then Postgres. Retry and reindex are the same code path, so both are idempotent.
6. Insert chunks, embed them, upsert the vectors.
7. Set `READY` last.

Step 7 is the important one. Retrieval filters on `indexStatus`, so a half indexed source is invisible instead of answering from a third of its chunks.

## Tradeoffs

**Chunking.** Recursive and markdown aware. Deterministic and pure, so it needs no model call. Semantic chunking and contextual retrieval score better but cost a model call per document or per chunk.

**Vector store.** Qdrant, one collection, `userId` as an `is_tenant` payload index with `m: 0` and `payload_m: 16` so each tenant gets its own HNSW subgraph rather than traversing a global one. Every query carries the tenant filter, which is what makes `m: 0` safe. At this scale pgvector is arguably the better call, one transaction and no dual write. Qdrant is a bet on growth and on keeping vector load off the OLTP primary.

**The main correctness risk.** Postgres and Qdrant share no transaction. Mitigated by making the worker the only writer, keying delete-then-upsert on `sourceId` so retries are idempotent, and setting `READY` only after the upsert lands. In production this wants a transactional outbox plus a sweep comparing `chunkCount` against `qdrant.count()`.

**What breaks at scale.** Dual write drift · no reranking, wants hybrid BM25 plus a cross encoder · embedding rate limits, wants the Batch API · one job per document blocks a worker on long content · polling `/sources` does not survive many tabs · `rawText` bloats Postgres backups.

**Debuggability.** pino with a `requestId` carried from the http request into the BullMQ job. Every query logs the retrieval funnel: how many chunks came back, how many cleared the threshold, how many were cited, plus `topScore` and token counts. A vague answer at `topScore: 0.31` is a retrieval problem; the same answer at `0.82` is a prompt problem. Without the funnel you are guessing.

## Frontend

`apps/web` is a Next.js 15 App Router client. Editorial archive look: warm paper rather than white, hairline rules instead of shadows, one sienna accent, and mono reserved for data.

The part worth knowing about is the citation tie. An answer comes back as prose containing `[1]` markers plus a parallel `citations[]` array. `AnswerBody` walks the rendered markdown and swaps each marker for a button that shares hover state with its source card, so hovering a marker lights its card and hovering a card lights every claim it backs. Keyboard focus drives the same highlight.

Two other details that matter more than they look:

- The source list poll returns `false` from `refetchInterval` once nothing is `PENDING` or `PROCESSING`, so an idle tab stops hitting the API instead of polling forever.
- Every page pings `/health` on the api and the worker every five seconds. On hosts that idle a service to sleep this keeps both awake while somebody is actually using the site.

## Notes

Redis needs `maxmemory-policy noeviction`. BullMQ stores job state in Redis, and an eviction policy like `volatile-lru` can silently drop jobs under memory pressure.
