import { Redis } from "ioredis";
import { env } from "@repo/config";

const PING_TIMEOUT_MS = 2_000;
const RECONNECT_CEILING_MS = 10_000;

export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  retryStrategy: (attempt) => Math.min(attempt * 200, RECONNECT_CEILING_MS),
  reconnectOnError: () => true,
});

connection.on("error", () => {});

export class RedisTimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`Redis did not answer ${operation} within ${ms}ms`);
    this.name = "RedisTimeoutError";
  }
}

export function withRedisTimeout<T>(
  operation: string,
  ms: number,
  work: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RedisTimeoutError(operation, ms));
    }, ms);

    work().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function pingRedis(): Promise<boolean> {
  try {
    const reply = await withRedisTimeout("ping", PING_TIMEOUT_MS, () =>
      connection.ping(),
    );
    return reply === "PONG";
  } catch {
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (connection.status === "end") return;
  await connection.quit().catch(() => connection.disconnect());
}
