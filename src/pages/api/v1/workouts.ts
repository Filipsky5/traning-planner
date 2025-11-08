/**
 * GET /api/v1/workouts - Lista treningów z filtrami i paginacją
 * POST /api/v1/workouts - Utworzenie nowego treningu (planned lub completed)
 *
 * Analogia do iOS: Endpoint REST API w aplikacji mobilnej
 * SSR w Astro: Kod wykonuje się na serwerze (Node.js), nie w przeglądarce
 *
 * Features:
 * - Autoryzacja: wszystkie operacje wymagają zalogowanego użytkownika
 * - Ownership: użytkownik operuje tylko na swoich treningach
 * - Walidacja: Zod schemas dla query params i request body
 * - Error handling: spójne error responses z kodami HTTP
 */
export const prerender = false;

import type { APIContext } from "astro";
import { listQuerySchema, createWorkoutSchema } from "../../../lib/validation/workouts";
import { listWorkouts, createWorkout } from "../../../lib/services/workoutsService";
import type { ApiListResponse, ApiResponse, WorkoutSummaryDto, WorkoutDetailDto } from "../../../types";

/**
 * GET /api/v1/workouts
 *
 * Lista treningów z zaawansowanymi filtrami:
 * - status, training_type_code, origin, rating
 * - planned_date_gte/lte, completed_at_gte/lte
 * - sort, page, per_page
 *
 * Response: ApiListResponse<WorkoutSummaryDto>
 */
export async function GET(context: APIContext) {
  try {
    // 1. Auth check - guard clause pattern
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Validate query params przez Zod
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const filters = listQuerySchema.parse(params);

    // 3. Fetch workouts z service layer
    const { data, total } = await listWorkouts(context.locals.supabase, user.id, filters);

    // 4. Build response envelope
    const response: ApiListResponse<WorkoutSummaryDto> = {
      data,
      page: filters.page,
      per_page: filters.per_page,
      total
    };

    // 5. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("GET /api/v1/workouts - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid query parameters",
            details: err.errors
          }
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe/DB - loguj szczegóły (bez danych osobowych)
    console.error("GET /api/v1/workouts failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

/**
 * POST /api/v1/workouts
 *
 * Utworzenie nowego treningu - planned (tylko plan) lub completed (z metrykami).
 *
 * Request body:
 * - Planned: training_type_code, planned_date, position, planned_distance_m, planned_duration_s, steps
 * - Completed: + status=completed, distance_m, duration_s, avg_hr_bpm, completed_at, rating (optional)
 *
 * Response: 201 Created z ApiResponse<WorkoutDetailDto>
 * Errors: 401, 404 (invalid training_type_code), 409 (duplicate position), 422
 */
export async function POST(context: APIContext) {
  try {
    // 1. Auth check - guard clause
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Parse and validate request body
    const body = await context.request.json();
    const input = createWorkoutSchema.parse(body);

    // 3. Create workout przez service layer
    const workout = await createWorkout(context.locals.supabase, user.id, input);

    // 4. Build response envelope
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    // 5. Happy path - zwróć 201 Created
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("POST /api/v1/workouts - validation error", {
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

    // Guard: training_type_code nie istnieje
    if (err.message === "INVALID_TRAINING_TYPE") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "Training type not found" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Guard: duplikat position dla (user_id, planned_date, position)
    if (err.message === "DUPLICATE_POSITION") {
      return new Response(
        JSON.stringify({
          error: {
            code: "duplicate_position",
            message: "Workout with this position already exists for the given date"
          }
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("POST /api/v1/workouts failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
