export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "gone"
  | "too_many_requests"
  | "internal_error"
  | "not_implemented";

export interface ApiErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: ApiErrorCode, message: string, options?: ApiErrorOptions) {
    super(message, options);
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function createApiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  options?: ApiErrorOptions
): ApiError {
  return new ApiError(status, code, message, options);
}
