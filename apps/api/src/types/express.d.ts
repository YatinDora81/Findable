import type { Logger } from "@repo/logger";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      userId: string;
      sessionId?: string;
    }
  }
}

export {};
