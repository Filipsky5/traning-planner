/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/v1/internal/ai/logs - Ingest AI log
 * GET /api/v1/internal/ai/logs - List AI logs
 *
 * INTERNAL-ONLY ENDPOINTS - dostępne WYŁĄCZNIE dla service-role key.
 * NIE używać user JWT tokens! Endpoint służy do logowania interakcji z AI
 * (OpenRouter) w celach diagnostycznych i monitorowania kosztów.
 *
 * Analogia do iOS: Podobne do internal analytics/telemetry endpoint'u
 * w backend API (np. logging do Mixpanel/Amplitude server-side).
 * W aplikacjach mobilnych takie endpoint'y są wywoływane przez backend,
 * nigdy bezpośrednio z aplikacji.
 *
 * BEZPIECZEŃSTWO:
 * - Service-role key ma pełny dostęp do bazy (omija RLS)
 * - NIE wolno eksponować service-role key w kodzie client-side
 * - Payload może zawierać PII - NIE logować w console.error
 *
 * Features:
 * - POST: Asynchroniczny ingest (202 Accepted)
 * - GET: Paginacja i filtry (event, level, date range)
 * - Brak cache (dane diagnostyczne, zawsze fresh)
 */
export const prerender = false;

import type { APIContext } from "astro";
import { aiLogIngestSchema, aiLogListQuerySchema } from "../../../../../lib/validation/aiLogs";
import { ingestAiLog, listAiLogs } from "../../../../../lib/services/aiLogsService";
import { requireServiceRole } from "../../../../../lib/http/auth";
import { jsonResponse, errorResponse } from "../../../../../lib/http/responses";
import { createApiError, isApiError } from "../../../../../lib/http/errors";
import type { ApiListResponse, AiLogDto } from "../../../../../types";

/**
 * Handler POST dla endpoint'u - ingest pojedynczego logu AI.
 *
 * Przepływ:
 * 1. Auth check - service-role key (guard clause)
 * 2. Parse i validate request body (Zod schema)
 * 3. Ingest log do bazy przez service layer
 * 4. Return 202 Accepted (asynchroniczny ingest)
 *
 * Response:
 * - 202 Accepted - log został przyjęty do przetworzenia
 * - 400 Bad Request - niepoprawny JSON
 * - 401 Unauthorized - brak Authorization header
 * - 403 Forbidden - niepoprawny service-role key
 * - 422 Unprocessable Entity - walidacja Zod failed
 * - 500 Internal Server Error - błąd bazy danych
 */
export async function POST(context: APIContext) {
  try {
    // 1. Auth check (guard clause) - KRYTYCZNE: tylko service-role key
    // Rzuca ApiError(401/403/500) jeśli auth niepoprawny
    requireServiceRole(context);

    // 2. Parse request body (może rzucić SyntaxError jeśli invalid JSON)
    const rawBody = await context.request.json();

    // 3. Validate request body (guard clause)
    // Rzuca ZodError jeśli walidacja failed
    const body = aiLogIngestSchema.parse(rawBody);

    // 4. Ingest log do bazy przez service layer
    // Rzuca Supabase error jeśli insert failed
    const supabase = context.locals.supabase;
    await ingestAiLog(supabase, body);

    // 5. Happy path: Return 202 Accepted
    // 202 = request accepted for processing (asynchroniczny ingest)
    return jsonResponse(202, { data: { status: "accepted" } });
  } catch (err: any) {
    // Error handling - różne typy błędów mają różne response codes

    // Handle ApiError (z requireServiceRole)
    if (isApiError(err)) {
      return errorResponse(err);
    }

    // Handle Zod validation error
    if (err.name === "ZodError") {
      const invalidParams = err.errors.map((e: any) => e.path.join("."));
      return errorResponse(
        createApiError(422, "validation_error", "Invalid request body", {
          details: { invalid_params: invalidParams },
        })
      );
    }

    // Handle JSON parse error
    if (err instanceof SyntaxError) {
      return errorResponse(createApiError(400, "validation_error", "Invalid JSON body"));
    }

    // Handle unexpected errors (database errors, network errors, etc.)
    // UWAGA: NIE logujemy payload (może zawierać PII)
    // UWAGA: NIE logujemy do ai_logs (circular dependency!)
    console.error("POST /api/v1/internal/ai/logs failed", {
      error: err.message,
      name: err.name,
    });
    return errorResponse(createApiError(500, "internal_error", "Failed to ingest log"));
  }
}

/**
 * Handler GET dla endpoint'u - lista logów AI z filtrami i paginacją.
 *
 * Przepływ:
 * 1. Auth check - service-role key (guard clause)
 * 2. Parse i validate query params (Zod schema)
 * 3. Fetch logs z bazy przez service layer
 * 4. Return 200 OK z ApiListResponse (data + pagination metadata)
 *
 * Query params:
 * - event (optional) - filtr po typie zdarzenia
 * - level (optional) - filtr po poziomie loga
 * - created_after (optional) - filtr po dacie (ISO timestamp)
 * - created_before (optional) - filtr po dacie (ISO timestamp)
 * - page (optional, default: 1) - numer strony
 * - per_page (optional, default: 20, max: 100) - liczba elementów na stronę
 *
 * Response:
 * - 200 OK - lista logów z pagination metadata
 * - 401 Unauthorized - brak Authorization header
 * - 403 Forbidden - niepoprawny service-role key
 * - 422 Unprocessable Entity - walidacja query params failed
 * - 500 Internal Server Error - błąd bazy danych
 */
export async function GET(context: APIContext) {
  try {
    // 1. Auth check (guard clause) - KRYTYCZNE: tylko service-role key
    requireServiceRole(context);

    // 2. Parse query params z URL
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // 3. Validate query params (guard clause)
    // Rzuca ZodError jeśli walidacja failed
    // Zod automatycznie konwertuje string'i na number'y (z.coerce.number())
    const validated = aiLogListQuerySchema.parse(params);

    // 4. Extract filters i pagination z validated params
    const filters = {
      event: validated.event,
      level: validated.level,
      created_after: validated.created_after,
      created_before: validated.created_before,
    };
    const pagination = {
      page: validated.page,
      per_page: validated.per_page,
    };

    // 5. Fetch logs z bazy przez service layer
    // Zwraca { logs: AiLogDto[], total: number }
    const supabase = context.locals.supabase;
    const { logs, total } = await listAiLogs(supabase, filters, pagination);

    // 6. Prepare response z pagination metadata
    const response: ApiListResponse<AiLogDto> = {
      data: logs,
      page: pagination.page,
      per_page: pagination.per_page,
      total,
    };

    // 7. Happy path: Return 200 OK
    // Brak cache (dane diagnostyczne, zawsze fresh)
    return jsonResponse(200, response);
  } catch (err: any) {
    // Error handling

    // Handle ApiError (z requireServiceRole)
    if (isApiError(err)) {
      return errorResponse(err);
    }

    // Handle Zod validation error
    if (err.name === "ZodError") {
      const invalidParams = err.errors.map((e: any) => e.path.join("."));
      return errorResponse(
        createApiError(422, "validation_error", "Invalid query parameters", {
          details: { invalid_params: invalidParams },
        })
      );
    }

    // Handle unexpected errors
    console.error("GET /api/v1/internal/ai/logs failed", {
      error: err.message,
      name: err.name,
    });
    return errorResponse(createApiError(500, "internal_error", "Failed to fetch logs"));
  }
}
