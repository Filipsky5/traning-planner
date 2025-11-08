/**
 * POST /api/v1/workouts/[id]/complete
 *
 * Domain action: oznaczenie treningu jako ukończonego.
 *
 * Analogia do iOS: Domain-specific endpoint (jak /orders/:id/confirm w e-commerce)
 * Lepsze niż PATCH z status=completed bo:
 * - Intent is clear (semantic endpoint)
 * - Validation specific to action (wymaga metryk)
 * - Business logic encapsulated (auto-calculate avg_pace)
 *
 * Status transition: planned → completed
 * Guard: jeśli już completed → 409 Conflict
 *
 * Request body: distance_m, duration_s, avg_hr_bpm, completed_at, rating (optional)
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404, 409 (already completed), 422
 */
export const prerender = false;

import type { APIContext } from "astro";
import { completeWorkoutSchema } from "../../../../../lib/validation/workouts";
import { completeWorkout } from "../../../../../lib/services/workoutsService";
import type { ApiResponse, WorkoutDetailDto } from "../../../../../types";

export async function POST(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Extract id from URL params
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({ error: { code: "bad_request", message: "Workout ID required" } }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // 3. Parse and validate body
    const body = await context.request.json();
    const input = completeWorkoutSchema.parse(body);

    // 4. Complete workout (status transition + set metrics)
    const workout = await completeWorkout(context.locals.supabase, user.id, id, input);

    // 5. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 6. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("POST /api/v1/workouts/[id]/complete - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid completion data",
            details: err.errors
          }
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Guard: workout nie istnieje lub nie należy do użytkownika
    if (err.message === "NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Guard: workout już ukończony (invalid state transition)
    if (err.message === "ALREADY_COMPLETED") {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_status_transition",
            message: "Workout is already completed"
          }
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("POST /api/v1/workouts/[id]/complete failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
