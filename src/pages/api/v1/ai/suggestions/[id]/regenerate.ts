import type { APIContext } from "astro";

import { requireUserId } from "../../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../../lib/http/errors";
import { getRequiredPathParam, parseOptionalJsonBody } from "../../../../../../lib/http/request";
import { errorResponse, jsonResponse } from "../../../../../../lib/http/responses";
import { regenerateBodySchema, type RegenerateBody } from "../../../../../../lib/validation/aiSuggestions";
import { regenerateSuggestion } from "../../../../../../lib/services/aiSuggestionsService";
import type { ApiResponse } from "../../../../../../types";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const id = getRequiredPathParam(context.params, "id");
    const rawBody = (await parseOptionalJsonBody(context.request)) ?? {};
    const body = regenerateBodySchema.parse(rawBody) as RegenerateBody;
    const { userId } = await requireUserId(context);

    const result = await regenerateSuggestion(context.locals.supabase, userId, id, body);

    const payload: ApiResponse<typeof result.suggestion> = {
      data: result.suggestion,
    };

    return jsonResponse(201, payload, {
      Location: `/api/v1/ai/suggestions/${result.suggestion.id}`,
    });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid request payload", { cause: error }));
  }

  console.error("AI suggestion regenerate endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Unexpected server error", { cause: error }));
}

