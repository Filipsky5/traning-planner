/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * POST /api/v1/workouts/[id]/cancel
 *
 * Domain action: oznaczenie treningu jako anulowanego.
 *
 * Status transition: any → canceled
 * Side effect: clear all metrics (distance, duration, hr, completed_at, rating, avg_pace)
 * Guard: jeśli już canceled → 409 Conflict
 *
 * Request body: {} (empty)
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404, 409 (already canceled)
 */
export const prerender = false;

import type { APIContext } from "astro";
import { cancelWorkout } from "../../../../../lib/services/workoutsService";
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

    // 3. Cancel workout (status transition + clear metrics)
    const workout = await cancelWorkout(context.locals.supabase, user.id, id);

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

    // Guard: workout już canceled (invalid state transition)
    if (err.message === "ALREADY_CANCELED") {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_status_transition",
            message: "Workout is already canceled",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("POST /api/v1/workouts/[id]/cancel failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
