import type { Request, Response } from "express";
import { db } from "@repo/db";
import { pingRedis } from "@repo/queue";
import { collectionReady, keyRingStatus } from "@repo/rag";

export function health(_req: Request, res: Response): void {
  res.json({ data: { status: "ok", uptime: process.uptime() } });
}

export async function ready(req: Request, res: Response): Promise<void> {
  const [postgres, redis, qdrant] = await Promise.all([
    check(() => db.$queryRaw`select 1`),
    check(() => pingRedis()),
    check(async () => {
      const exists = await collectionReady();
      if (!exists) throw new Error("collection missing");
    }),
  ]);

  const checks = { postgres, redis, qdrant };
  const healthy = Object.values(checks).every((entry) => entry.ok);

  if (!healthy) req.log.warn({ checks }, "health.degraded");

  res.status(healthy ? 200 : 503).json({
    data: { status: healthy ? "ok" : "degraded", checks, keys: keyRingStatus() },
  });
}

type CheckResult = { ok: boolean; error?: string };

async function check(probe: () => Promise<unknown>): Promise<CheckResult> {
  try {
    await probe();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "failed" };
  }
}
