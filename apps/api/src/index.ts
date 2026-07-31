import { env } from "@repo/config";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import { closeConnection, closeQueue } from "@repo/queue";
import { createServer } from "./server.ts";

const log = createLogger("api");

const server = createServer().listen(env.PORT, () => {
  log.info({ port: env.PORT, env: env.NODE_ENV }, "api.started");
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  log.info({ signal }, "api.shutdown");

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeQueue();
  await closeConnection();
  await db.$disconnect();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
