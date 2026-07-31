import type { RequestHandler } from "express";
import { AppError } from "@repo/contracts";

type Bucket = { count: number; resetAt: number };

export function rateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
}): RequestHandler {
  const buckets = new Map<string, Bucket>();

  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";

    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }

    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > options.max) {
      next(new AppError("RATE_LIMITED", options.message));
      return;
    }

    next();
  };
}
