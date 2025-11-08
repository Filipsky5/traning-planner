import type { APIContext } from "astro";

import { requireUserId } from "../../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../../lib/http/errors";
import { getRequiredPathParam } from "../../../../../../lib/http/request";
import { errorResponse, jsonResponse } from "../../../../../../lib/http/responses";
import { eventsQuerySchema, type EventsQueryParams } from "../../../../../../lib/validation/aiSuggestions";
import {
  fetchSuggestionRow,
  listSuggestionEvents,
  type ListEventsFilters,
} from "../../../../../../lib/services/aiSuggestionsService";
import type { ApiListResponse, AiSuggestionEventDto } from "../../../../../../types";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const id = getRequiredPathParam(context.params, "id");
    const filters = parseEventsQuery(context.request.url);
    const { userId } = await requireUserId(context);

    // Verify ownership (throws 404 if not found or not owned by user)
    await fetchSuggestionRow(context.locals.supabase, userId, id);

    // Fetch events with pagination
    const result = await listSuggestionEvents(context.locals.supabase, userId, id, filters);

    const payload: ApiListResponse<AiSuggestionEventDto> = {
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

function parseEventsQuery(urlString: string): ListEventsFilters {
  const url = new URL(urlString);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = eventsQuerySchema.parse(params) as EventsQueryParams;

  return {
    page: parsed.page,
    per_page: parsed.per_page,
  };
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid query parameters", { cause: error }));
  }

  console.error("AI suggestion events endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Failed to load events", { cause: error }));
}
