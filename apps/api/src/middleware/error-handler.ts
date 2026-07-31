import type { ErrorRequestHandler, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { AppError, isAppError, type ErrorCodeName } from "@repo/contracts";
import { Prisma } from "@repo/db";

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

  req.log.error({ err: error }, "request.unhandled");
  send(res, req, 500, "INTERNAL", "Something went wrong");
};

function send(
  res: Response,
  req: Request,
  status: number,
  code: ErrorCodeName,
  message: string,
  details: unknown = null,
): void {
  res.status(status).json({
    error: { code, message, details, requestId: req.id },
  });
}

export { AppError };
