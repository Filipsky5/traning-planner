/**
 * GET /api/v1/workouts/[id] - Szczegóły pojedynczego treningu
 * PATCH /api/v1/workouts/[id] - Aktualizacja treningu (partial update)
 * DELETE /api/v1/workouts/[id] - Usunięcie treningu
 *
 * Analogia do iOS: REST endpoints z URL params (jak /users/:id w REST API)
 * [id] w nazwie pliku = dynamic route parameter w Astro
 *
 * Features:
 * - URL params extraction: context.params.id
 * - Ownership verification: tylko owner może GET/PATCH/DELETE
 * - Immutable fields protection: Zod strict mode w updateWorkoutSchema
 * - FK constraint handling: nie można usunąć workout z accepted AI suggestion
 */
export const prerender = false;

import type { APIContext } from "astro";
import { updateWorkoutSchema } from "../../../../lib/validation/workouts";
import { getWorkoutById, updateWorkout, deleteWorkout } from "../../../../lib/services/workoutsService";
import type { ApiResponse, WorkoutDetailDto } from "../../../../types";

/**
 * GET /api/v1/workouts/[id]
 *
 * Pobranie szczegółów pojedynczego treningu.
 * Ownership verification: tylko owner może pobrać szczegóły.
 *
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404 (not found or not owner)
 */
export async function GET(context: APIContext) {
  try {
    // 1. Auth check - guard clause
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

    // 3. Get workout (ownership verification inside service)
    const workout = await getWorkoutById(context.locals.supabase, user.id, id);

    // 4. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 5. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Guard: workout nie istnieje lub nie należy do użytkownika
    if (err.message === "NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("GET /api/v1/workouts/[id] failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

/**
 * PATCH /api/v1/workouts/[id]
 *
 * Aktualizacja treningu (partial update).
 * Immutable fields (id, user_id, origin, ai_suggestion_id, avg_pace_s_per_km) są chronione
 * przez Zod strict mode - próba zmiany rzuci validation error.
 *
 * Request body: partial WorkoutUpdateCommand
 * Response: 200 OK z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404, 422 (validation + immutable fields)
 */
export async function PATCH(context: APIContext) {
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

    // 3. Parse and validate body (strict mode - blokuje immutable fields)
    const body = await context.request.json();
    const input = updateWorkoutSchema.parse(body);

    // 4. Update workout (ownership verification inside service)
    const workout = await updateWorkout(context.locals.supabase, user.id, id, input);

    // 5. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 6. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod (w tym immutable fields)
    if (err.name === "ZodError") {
      console.warn("PATCH /api/v1/workouts/[id] - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid workout data",
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

    // Błędy serwerowe
    console.error("PATCH /api/v1/workouts/[id] failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/v1/workouts/[id]
 *
 * Usunięcie treningu.
 * FK constraint: nie można usunąć workout jeśli jest referenced przez accepted AI suggestion.
 *
 * Response: 204 No Content
 * Errors: 401, 404, 409 (FK constraint)
 */
export async function DELETE(context: APIContext) {
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

    // 3. Delete workout (ownership verification inside service)
    await deleteWorkout(context.locals.supabase, user.id, id);

    // 4. Happy path - zwróć 204 No Content (bez body)
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Guard: workout nie istnieje lub nie należy do użytkownika
    if (err.message === "NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Guard: FK constraint violation (workout created from accepted AI suggestion)
    // Remediation hint: user musi najpierw revert acceptance AI suggestion
    if (err.message === "FK_CONSTRAINT") {
      return new Response(
        JSON.stringify({
          error: {
            code: "fk_constraint_violation",
            message: "Cannot delete workout created from accepted AI suggestion. Revert acceptance first."
          }
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("DELETE /api/v1/workouts/[id] failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
