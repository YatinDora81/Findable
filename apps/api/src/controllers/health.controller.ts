import type { Request, Response } from "express";
import { db } from "@repo/db";
import { pingRedis } from "@repo/queue";
import { collectionReady, keyRingStatus } from "@repo/rag";

export function health(_req: Request, res: Response): void {
  res.json({ data: { status: "ok", uptime: process.uptime() } });
}

export async function ready(req: Request, res: Response): Promise<void> {
  const [postgres, redis, qdrant] = await Promise.all([
    check("postgres", req, () => db.$queryRaw`select 1`),
    check("redis", req, () => pingRedis()),
    check("qdrant", req, async () => {
      const exists = await collectionReady();
      if (!exists) throw new Error("collection missing");
    }),
  ]);

  const keys = keyRingStatus();
  const checks = { postgres, redis, qdrant };
  const healthy = postgres && redis && qdrant;

  res.status(healthy ? 200 : 503).json({
    data: {
      status: healthy ? "ok" : "degraded",
      checks,
      keys: { total: keys.length, usable: keys.filter((k) => !k.disabled).length },
    },
  });
}

async function check(
  name: string,
  req: Request,
  probe: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await probe();
    return true;
  } catch (error) {
    req.log.warn({ err: error, dependency: name }, "health.dependency_down");
    return false;
  }
}
