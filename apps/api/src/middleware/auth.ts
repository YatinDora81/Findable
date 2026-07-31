import type { RequestHandler } from "express";
import { env } from "@repo/config";
import { AppError } from "@repo/contracts";
import { db } from "@repo/db";
import { readBearerToken, resolveSession } from "../lib/auth.ts";

const DEMO_USER_ID = "usr_demo";

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    if (env.NODE_ENV === "production") {
      next(
        new AppError(
          "FORBIDDEN",
          "Missing bearer token, start a guest session at /api/v1/auth/guest",
        ),
      );
      return;
    }

    req.userId = DEMO_USER_ID;
    next();
    return;
  }

  resolveSession(token)
    .then((session) => {
      if (!session) {
        next(new AppError("FORBIDDEN", "Session expired, start a new one"));
        return;
      }

      req.userId = session.userId;
      req.sessionId = session.id;

      if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
        void db.session
          .update({
            where: { id: session.id },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => {});
      }

      next();
    })
    .catch(next);
};
