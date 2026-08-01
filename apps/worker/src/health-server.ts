import { randomUUID } from "node:crypto";
import { env } from "@repo/config";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import { ingestJobCounts, pingRedis } from "@repo/queue";

const log = createLogger("worker-health");

const workerPort = env.WORKER_PORT ?? env.PORT;

const corsFor = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && env.WEB_ORIGIN.includes(origin) ? origin : (env.WEB_ORIGIN[0] ?? "*"),
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsFor(origin) },
  });

export function startHealthServer() {
  const server = Bun.serve({
    port: workerPort,

    async fetch(request) {
      const { pathname } = new URL(request.url);
      const origin = request.headers.get("origin");

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsFor(origin) });
      }

      if (pathname === "/health") {
        return json({ data: { status: "ok", uptime: process.uptime() } }, 200, origin);
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
          origin,
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
        origin,
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
