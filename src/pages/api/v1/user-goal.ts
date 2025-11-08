/**
 * GET /api/v1/user-goal - Get current user goal or null
 * PUT /api/v1/user-goal - Create or replace user goal
 * DELETE /api/v1/user-goal - Delete user goal
 *
 * Analogia do iOS: REST API endpoint w aplikacji mobilnej
 * SSR w Astro: Kod wykonuje się na serwerze (Node.js), nie w przeglądarce
 *
 * Features:
 * - Autoryzacja: wszystkie operacje wymagają zalogowanego użytkownika
 * - Ownership: użytkownik operuje tylko na swoim celu
 * - Walidacja: Zod schema dla PUT request body
 * - Error handling: spójne error responses z kodami HTTP
 */
export const prerender = false;

import type { APIContext } from "astro";
import { userGoalUpsertSchema } from "../../../lib/validation/userGoals";
import { getUserGoal, upsertUserGoal, deleteUserGoal } from "../../../lib/services/userGoalsService";
import type { ApiResponse, UserGoalDto } from "../../../types";

/**
 * GET /api/v1/user-goal
 *
 * Returns current user goal or null if not set.
 *
 * Response: ApiResponse<UserGoalDto | null>
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

    // 2. Fetch goal z service layer
    const goal = await getUserGoal(context.locals.supabase, user.id);

    // 3. Build response envelope
    const response: ApiResponse<UserGoalDto | null> = { data: goal };

    // 4. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Błędy serwerowe/DB - loguj szczegóły (bez danych osobowych)
    console.error("GET /api/v1/user-goal failed", {
      error: err,
      message: err.message,
      stack: err.stack,
      name: err.name,
      stringified: JSON.stringify(err)
    });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

/**
 * PUT /api/v1/user-goal
 *
 * Create or replace user goal (upsert).
 * Używa ON CONFLICT dla atomic operation.
 *
 * Request body:
 * - goal_type: "distance_by_date" (tylko ta wartość w MVP)
 * - target_distance_m: number (1-1000000)
 * - due_date: string YYYY-MM-DD (dzisiaj lub w przyszłości)
 * - notes: string (opcjonalne, max 500 znaków)
 *
 * Response: 200 OK z ApiResponse<UserGoalDto>
 * Errors: 401, 422
 */
export async function PUT(context: APIContext) {
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
    const input = userGoalUpsertSchema.parse(body);

    // 3. Upsert goal przez service layer
    const goal = await upsertUserGoal(context.locals.supabase, user.id, input);

    // 4. Build response envelope
    const response: ApiResponse<UserGoalDto> = { data: goal };

    // 5. Happy path - zwróć 200 OK (nie 201, bo może być update)
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("PUT /api/v1/user-goal - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid goal data",
            details: err.errors
          }
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("PUT /api/v1/user-goal failed", {
      error: err,
      message: err.message,
      stack: err.stack,
      name: err.name,
      stringified: JSON.stringify(err)
    });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/v1/user-goal
 *
 * Delete user goal.
 *
 * Response: 204 No Content
 * Errors: 401, 404 (jeśli cel nie istnieje)
 */
export async function DELETE(context: APIContext) {
  try {
    // 1. Auth check - guard clause
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Delete goal przez service layer
    await deleteUserGoal(context.locals.supabase, user.id);

    // 3. Happy path - zwróć 204 No Content
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Guard: goal nie istnieje
    if (err.message === "GOAL_NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "No goal found to delete" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe
    console.error("DELETE /api/v1/user-goal failed", {
      error: err,
      message: err.message,
      stack: err.stack,
      name: err.name,
      stringified: JSON.stringify(err)
    });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
