/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/v1/workouts/last3
 *
 * Endpoint zwracający ostatnie 3 ukończone treningi.
 * Używany przez AI do uzyskania kontekstu o ostatnich treningach użytkownika.
 *
 * Analogia do iOS: Jak endpoint do pobrania recent items (np. ostatnie wyszukiwania)
 *
 * Features:
 * - Zawsze status=completed (tylko ukończone treningi)
 * - Optional filter by training_type_code (np. tylko "easy" runs)
 * - ORDER BY completed_at DESC LIMIT 3 (najnowsze pierwsze)
 * - Minimal payload (id, completed_at, training_type_code) - performance optimization
 * - Uses database index: (user_id, training_type_code, completed_at DESC)
 *
 * Query params:
 * - training_type_code (optional) - filtr typu treningu
 *
 * Response: ApiListResponse<WorkoutLast3ItemDto>
 * Errors: 401, 422
 */
export const prerender = false;

import type { APIContext } from "astro";
import { last3QuerySchema } from "../../../../lib/validation/workouts";
import { getLastThreeWorkouts } from "../../../../lib/services/workoutsService";
import type { ApiListResponse, WorkoutLast3ItemDto } from "../../../../types";

export async function GET(context: APIContext) {
  try {
    // 1. Auth check - guard clause
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Validate query params przez Zod
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const { training_type_code } = last3QuerySchema.parse(params);

    // 3. Fetch last 3 completed workouts
    const data = await getLastThreeWorkouts(context.locals.supabase, user.id, training_type_code);

    // 4. Build response envelope
    // page=1, per_page=3 (always), total=count (ale max 3)
    const response: ApiListResponse<WorkoutLast3ItemDto> = {
      data,
      page: 1,
      per_page: 3,
      total: data.length,
    };

    // 5. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("GET /api/v1/workouts/last3 - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid query parameters",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe/DB
    console.error("GET /api/v1/workouts/last3 failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
