import { createApiError } from "./errors";

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    throw createApiError(400, "validation_error", "Invalid JSON payload", { cause: error });
  }
}

export function getRequiredPathParam(params: Record<string, string | undefined>, key: string): string {
  const value = params[key];
  if (!value) {
    throw createApiError(400, "validation_error", `Missing path parameter: ${key}`);
  }
  return value;
}

export async function parseOptionalJsonBody(request: Request): Promise<unknown | undefined> {
  const text = await request.text();
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw createApiError(400, "validation_error", "Invalid JSON payload", { cause: error });
  }
}
