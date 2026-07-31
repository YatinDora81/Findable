import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { logger } from "@repo/logger";

export const context: RequestHandler = (req, res, next) => {
  const incoming = req.headers["x-request-id"];

  req.id = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
  req.log = logger.child({ requestId: req.id });

  res.setHeader("X-Request-Id", req.id);

  next();
};

export const accessLog: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    req.log.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - startedAt,
      },
      "request.complete",
    );
  });

  next();
};
