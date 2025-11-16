import type { APIContext } from "astro";

import { requireUserId } from "../../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../../lib/http/errors";
import { getRequiredPathParam } from "../../../../../../lib/http/request";
import { errorResponse, jsonResponse } from "../../../../../../lib/http/responses";
import { rejectSuggestion } from "../../../../../../lib/services/aiSuggestionsService";
import type { ApiResponse } from "../../../../../../types";

export const prerender = false;

export async function POST(context: APIContext) {
  try {
    const id = getRequiredPathParam(context.params, "id");
    await assertEmptyBody(context.request);
    const { userId } = await requireUserId(context);

    const result = await rejectSuggestion(context.locals.supabase, userId, id);

    const payload: ApiResponse<typeof result.suggestion> = {
      data: result.suggestion,
    };

    return jsonResponse(200, payload);
  } catch (error) {
    return handleError(error);
  }
}

async function assertEmptyBody(request: Request): Promise<void> {
  const text = await request.text();
  if (text.trim().length > 0) {
    throw createApiError(400, "validation_error", "Request body must be empty");
  }
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  console.error("AI suggestion reject endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Unexpected server error", { cause: error }));
}
