import type { APIContext } from "astro";

import { requireUserId } from "../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../lib/http/errors";
import { parseJsonBody } from "../../../../../lib/http/request";
import { errorResponse, jsonResponse } from "../../../../../lib/http/responses";
import {
  createBodySchema,
  listQuerySchema,
  type CreateBody,
  type ListQueryParams,
} from "../../../../../lib/validation/aiSuggestions";
import {
  createSuggestion,
  listSuggestions,
  type ListSuggestionsFilters,
} from "../../../../../lib/services/aiSuggestionsService";
import type { ApiListResponse, ApiResponse } from "../../../../../types";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const filters = parseListQuery(context.request.url);
    const { userId } = await requireUserId(context);

    const result = await listSuggestions(context.locals.supabase, userId, filters);

    const payload: ApiListResponse<typeof result.data[number]> = {
      data: result.data,
      page: result.page,
      per_page: result.perPage,
      total: result.total,
    };

    return jsonResponse(200, payload);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(context: APIContext) {
  try {
    const rawBody = await parseJsonBody(context.request);
    const body = createBodySchema.parse(rawBody) as CreateBody;
    const { userId } = await requireUserId(context);

    const result = await createSuggestion(context.locals.supabase, userId, body);

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

function parseListQuery(urlString: string): ListSuggestionsFilters {
  const url = new URL(urlString);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = listQuerySchema.parse(params) as ListQueryParams;

  return {
    status: parsed.status,
    created_after: parsed.created_after,
    created_before: parsed.created_before,
    page: parsed.page,
    per_page: parsed.per_page,
    sort: parsed.sort,
  };
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid request payload", { cause: error }));
  }

  console.error("AI suggestions index endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Unexpected server error", { cause: error }));
}

