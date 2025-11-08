import type { APIContext } from "astro";

import { requireUserId } from "../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../lib/http/errors";
import { getRequiredPathParam } from "../../../../../lib/http/request";
import { errorResponse, jsonResponse } from "../../../../../lib/http/responses";
import { detailQuerySchema, type DetailQueryParams } from "../../../../../lib/validation/aiSuggestions";
import { getSuggestion } from "../../../../../lib/services/aiSuggestionsService";
import type { ApiResponse } from "../../../../../types";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const { userId } = await requireUserId(context);
    const id = getRequiredPathParam(context.params, "id");
    const includeExpired = parseDetailQuery(context.request.url);

    const result = await getSuggestion(context.locals.supabase, userId, id, includeExpired);

    const payload: ApiResponse<typeof result.suggestion> = {
      data: result.suggestion,
    };

    return jsonResponse(200, payload);
  } catch (error) {
    return handleError(error);
  }
}

function parseDetailQuery(urlString: string): boolean {
  const url = new URL(urlString);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = detailQuerySchema.parse(params) as DetailQueryParams;

  return parsed.include_expired ?? false;
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid query parameters", { cause: error }));
  }

  console.error("AI suggestion detail endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Unexpected server error", { cause: error }));
}

