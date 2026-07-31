import { z } from "zod";
import { parseGeminiKeys } from "./gemini-keys.ts";

const schema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  QDRANT_URL: z.url(),
  QDRANT_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  QDRANT_COLLECTION: z.string().min(1).default("chunks"),

  GEMINI_API_KEYS: z
    .string()
    .min(1)
    .transform((value, ctx) => {
      try {
        return parseGeminiKeys(value);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : String(error),
        });
        return z.NEVER;
      }
    }),

  EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-2"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  GENERATION_MODEL: z.string().min(1).default("gemini-3.6-flash"),
  UTILITY_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),

  PORT: z.coerce.number().int().positive().default(4000),
  WORKER_PORT: z.coerce.number().int().positive().default(4001),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  MAX_CONTENT_BYTES: z.coerce.number().int().positive().default(5_242_880),
  FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(50).default(8),
  SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
  INGEST_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(2),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment. Copy .env.example to .env and fill in the missing values.\n${detail}`,
    );
  }

  return parsed.data;
}

export const env = load();
