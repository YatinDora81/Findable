import { randomUUID } from "node:crypto";
import { env } from "@repo/config";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import { ingestJobCounts, pingRedis } from "@repo/queue";

const log = createLogger("worker-health");

const workerPort = env.WORKER_PORT ?? env.PORT;

const CORS = {
  "Access-Control-Allow-Origin": env.WEB_ORIGIN,
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });

export function startHealthServer() {
  const server = Bun.serve({
    port: workerPort,

    async fetch(request) {
      const { pathname } = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }

      if (pathname === "/health") {
        return json({ data: { status: "ok", uptime: process.uptime() } });
      }

      if (pathname === "/health/ready") {
        const [redis, postgres, counts] = await Promise.all([
          pingRedis(),
          probe(() => db.$queryRaw`select 1`),
          ingestJobCounts(),
        ]);

        const healthy = redis && postgres && counts !== null;

        return json(
          {
            data: {
              status: healthy ? "ok" : "degraded",
              checks: { redis, postgres, queue: counts !== null },
              queue: counts,
            },
          },
          healthy ? 200 : 503,
        );
      }

      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Not found",
            details: null,
            requestId: request.headers.get("x-request-id") ?? randomUUID(),
          },
        },
        404,
      );
    },
  });

  log.info({ port: workerPort }, "worker.health.listening");

  return server;
}

async function probe(check: () => Promise<unknown>): Promise<boolean> {
  try {
    await check();
    return true;
  } catch {
    return false;
  }
}
