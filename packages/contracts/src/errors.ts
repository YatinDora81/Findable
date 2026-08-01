export const ErrorCode = {
  VALIDATION_ERROR: { status: 400, retryable: false },
  BLOCKED_HOST: { status: 400, retryable: false },
  NOT_FOUND: { status: 404, retryable: false },
  FORBIDDEN: { status: 403, retryable: false },
  DUPLICATE_SOURCE: { status: 409, retryable: false },
  EMAIL_TAKEN: { status: 409, retryable: false },
  CONTENT_TOO_LARGE: { status: 413, retryable: false },
  UNSUPPORTED_TYPE: { status: 415, retryable: false },
  EXTRACTION_EMPTY: { status: 422, retryable: false },
  UNSUPPORTED_CONTENT: { status: 422, retryable: false },
  NO_CHUNKS: { status: 422, retryable: false },
  SOURCE_NOT_READY: { status: 409, retryable: true },
  RATE_LIMITED: { status: 429, retryable: true },
  UPSTREAM_ERROR: { status: 502, retryable: true },
  UPSTREAM_TIMEOUT: { status: 504, retryable: true },
  SERVICE_UNAVAILABLE: { status: 503, retryable: true },
  INTERNAL: { status: 500, retryable: false },
} as const;

export type ErrorCodeName = keyof typeof ErrorCode;

export class AppError extends Error {
  readonly code: ErrorCodeName;
  readonly publicMessage: string;
  readonly details: unknown;

  constructor(code: ErrorCodeName, publicMessage?: string, details?: unknown) {
    super(publicMessage ?? code);
    this.name = "AppError";
    this.code = code;
    this.publicMessage = publicMessage ?? code;
    this.details = details ?? null;
  }

  get status(): number {
    return ErrorCode[this.code].status;
  }

  get retryable(): boolean {
    return ErrorCode[this.code].retryable;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export type ErrorEnvelope = {
  error: {
    code: ErrorCodeName | string;
    message: string;
    details: unknown;
    requestId: string;
  };
};
