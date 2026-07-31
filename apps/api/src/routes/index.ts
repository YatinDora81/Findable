import { Router } from "express";
import { health, ready } from "../controllers/health.controller.ts";

export const routes: Router = Router();

routes.get("/health", health);
routes.get("/health/ready", ready);
