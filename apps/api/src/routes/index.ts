import { Router } from "express";
import { health, ready } from "../controllers/health.controller.ts";
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

routes.post("/ingest", createSource);
routes.get("/items", listSources);
