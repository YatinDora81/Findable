import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "@repo/config";
import { accessLog, context } from "./middleware/context.ts";
import { errorHandler, notFound } from "./middleware/error-handler.ts";
import { routes } from "./routes/index.ts";

export function createServer(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, exposedHeaders: ["X-Request-Id"] }));
  app.use(context);
  app.use(accessLog);

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
