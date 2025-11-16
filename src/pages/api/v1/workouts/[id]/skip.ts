/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/v1/workouts/[id]/skip
 *
 * Domain action: oznaczenie treningu jako pominiętego.
 *
 * Status transition: any → skipped
 * Side effect: clear all metrics (distance, duration, hr, completed_at, rating, avg_pace)
 * Guard: jeśli już skipped → 409 Conflict
 *
 * Request body: {} (empty)
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404, 409 (already skipped)
 */
export const prerender = false;

import type { APIContext } from "astro";
import { skipWorkout } from "../../../../../lib/services/workoutsService";
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

    // 3. Skip workout (status transition + clear metrics)
    const workout = await skipWorkout(context.locals.supabase, user.id, id);

    // 4. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 5. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Guard: workout nie istnieje lub nie należy do użytkownika
    if (err.message === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Guard: workout już skipped (invalid state transition)
    if (err.message === "ALREADY_SKIPPED") {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_status_transition",
            message: "Workout is already skipped",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("POST /api/v1/workouts/[id]/skip failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
