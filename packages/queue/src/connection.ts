import { Redis } from "ioredis";
import { env } from "@repo/config";

export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
});

connection.on("error", () => {});

export async function pingRedis(): Promise<boolean> {
  const reply = await connection.ping();
  return reply === "PONG";
}

export async function closeConnection(): Promise<void> {
  if (connection.status === "end") return;
  await connection.quit().catch(() => connection.disconnect());
}
