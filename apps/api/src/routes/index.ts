import { Router } from "express";
import { aliasQuerySchema } from "@repo/contracts";
import { health, ready } from "../controllers/health.controller.ts";
import { listMessages, query } from "../controllers/query.controller.ts";
import {
  createSource,
  deleteSource,
  getSource,
  listSources,
  reindexSource,
} from "../controllers/source.controller.ts";

export const routes: Router = Router();

routes.get("/health", health);
routes.get("/health/ready", ready);

routes.post("/sources", createSource);
routes.get("/sources", listSources);
routes.get("/sources/:id", getSource);
routes.delete("/sources/:id", deleteSource);
routes.post("/sources/:id/reindex", reindexSource);

routes.post("/sources/:id/query", query);
routes.get("/sources/:id/messages", listMessages);

routes.post("/ingest", createSource);
routes.get("/items", listSources);

routes.post("/query", (req, res, next) => {
  const parsed = aliasQuerySchema.safeParse(req.body);

  if (!parsed.success) {
    next(parsed.error);
    return;
  }

  req.params = { ...req.params, id: parsed.data.projectId };
  req.body = { question: parsed.data.question, topK: parsed.data.topK };

  query(req, res).catch(next);
});
