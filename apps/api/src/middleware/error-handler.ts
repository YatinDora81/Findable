import type {
  ErrorRequestHandler,
  Request,
  RequestHandler,
  Response,
} from "express";
import { ZodError } from "zod";
import { AppError, isAppError, type ErrorCodeName } from "@repo/contracts";
import { Prisma } from "@repo/db";
import { logger } from "@repo/logger";

export const notFound: RequestHandler = (req, res) => {
  send(res, req, 404, "NOT_FOUND", `Cannot ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    send(
      res,
      req,
      400,
      "VALIDATION_ERROR",
      "Invalid request",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
    return;
  }

  if (isAppError(error)) {
    send(res, req, error.status, error.code, error.publicMessage, error.details);
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      send(res, req, 404, "NOT_FOUND", "Not found");
      return;
    }

    if (error.code === "P2002") {
      send(res, req, 409, "DUPLICATE_SOURCE", "You already saved this");
      return;
    }
  }

  const body = readBodyParserError(error);

  if (body) {
    send(res, req, body.status, body.code, body.message);
    return;
  }

  log(req).error({ err: error }, "request.unhandled");
  send(res, req, 500, "INTERNAL", "Something went wrong");
};

type BodyParserFailure = {
  status: number;
  code: ErrorCodeName;
  message: string;
};

function readBodyParserError(error: unknown): BodyParserFailure | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = error as { type?: unknown; status?: unknown };

  if (typeof candidate.type !== "string") return null;

  if (candidate.type === "entity.too.large") {
    return {
      status: 413,
      code: "CONTENT_TOO_LARGE",
      message: "Request body is too large",
    };
  }

  if (
    candidate.type === "entity.parse.failed" ||
    candidate.type === "encoding.unsupported" ||
    candidate.type === "request.aborted"
  ) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Request body could not be read as json",
    };
  }

  if (candidate.type === "charset.unsupported") {
    return {
      status: 415,
      code: "UNSUPPORTED_TYPE",
      message: "Unsupported charset",
    };
  }

  return null;
}

const log = (req: Request) => req.log ?? logger;

function send(
  res: Response,
  req: Request,
  status: number,
  code: ErrorCodeName,
  message: string,
  details: unknown = null,
): void {
  res.status(status).json({
    error: { code, message, details, requestId: req.id ?? null },
  });
}

export { AppError };
