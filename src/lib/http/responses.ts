import type { ApiError } from "./errors";

export interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function jsonResponse<T>(status: number, payload: T, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
  });
}

export function errorResponse(error: ApiError, headers?: HeadersInit) {
  const body: ErrorPayload = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };

  return jsonResponse(error.status, body, headers);
}
