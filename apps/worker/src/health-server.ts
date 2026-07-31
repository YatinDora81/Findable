import { env } from "@repo/config";
import { db } from "@repo/db";
import { createLogger } from "@repo/logger";
import { ingestQueue, pingRedis } from "@repo/queue";

const log = createLogger("worker-health");

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
    port: env.WORKER_PORT,

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
          probe(() => pingRedis()),
          probe(() => db.$queryRaw`select 1`),
          ingestQueue.getJobCounts("active", "waiting", "delayed", "failed").catch(() => null),
        ]);

        const healthy = redis && postgres;

        return json(
          {
            data: {
              status: healthy ? "ok" : "degraded",
              checks: { redis, postgres },
              queue: counts,
            },
          },
          healthy ? 200 : 503,
        );
      }

      return json(
        { error: { code: "NOT_FOUND", message: "Not found", details: null } },
        404,
      );
    },
  });

  log.info({ port: env.WORKER_PORT }, "worker.health.listening");

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
