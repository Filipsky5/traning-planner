/**
 * POST /api/v1/workouts/[id]/rate
 *
 * Domain action: ocena ukończonego treningu.
 *
 * Guard: tylko completed workouts można ocenić (status != completed → 409)
 * Rating values: too_easy, just_right, too_hard
 * Use case: AI używa ratingu do dostosowania kolejnych sugestii
 *
 * Request body: { rating: "too_easy" | "just_right" | "too_hard" }
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404, 409 (not completed), 422
 */
export const prerender = false;

import type { APIContext } from "astro";
import { rateWorkoutSchema } from "../../../../../lib/validation/workouts";
import { rateWorkout } from "../../../../../lib/services/workoutsService";
import type { ApiResponse, WorkoutDetailDto } from "../../../../../types";

export async function POST(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Extract id from URL params
    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: { code: "bad_request", message: "Workout ID required" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 3. Parse and validate body
    const body = await context.request.json();
    const input = rateWorkoutSchema.parse(body);

    // 4. Rate workout (update rating field)
    const workout = await rateWorkout(context.locals.supabase, user.id, id, input);

    // 5. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 6. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("POST /api/v1/workouts/[id]/rate - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid rating data",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Guard: workout nie istnieje lub nie należy do użytkownika
    if (err.message === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Guard: można ocenić tylko ukończone treningi
    if (err.message === "NOT_COMPLETED") {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_status_transition",
            message: "Only completed workouts can be rated",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("POST /api/v1/workouts/[id]/rate failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
