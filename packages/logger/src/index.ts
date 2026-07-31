import { pino, type Logger } from "pino";
import { env } from "@repo/config";

const pretty = env.NODE_ENV === "development";

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "apiKey",
      "*.apiKey",
    ],
    censor: "[redacted]",
  },
  transport: pretty
    ? { target: "pino-pretty", options: { colorize: true, singleLine: false } }
    : undefined,
});

export function createLogger(name: string): Logger {
  return logger.child({ service: name });
}

export type { Logger };
