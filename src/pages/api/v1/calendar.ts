/**
 * GET /api/v1/calendar
 *
 * Endpoint zwracający widok kalendarza - treningi zgrupowane po datach.
 * Używany przez UI do wyświetlenia kalendarza z treningami.
 *
 * Analogia do iOS: Jak endpoint do calendar view w apps (Apple Calendar, Google Calendar)
 *
 * Features:
 * - Date range filter (start, end - YYYY-MM-DD, both required)
 * - Optional status filter (planned, completed, skipped, canceled)
 * - Grouping by planned_date (in application, not SQL)
 * - Minimal payload per workout (id, training_type_code, status, position)
 * - Uses database index: (user_id, planned_date)
 *
 * Query params:
 * - start (required) - data od (YYYY-MM-DD)
 * - end (required) - data do (YYYY-MM-DD)
 * - status (optional) - filtr statusu
 *
 * Response: ApiResponse<CalendarDto>
 * Errors: 401, 422 (invalid date range)
 */
export const prerender = false;

import type { APIContext } from "astro";
import { calendarQuerySchema } from "../../../lib/validation/workouts";
import { getCalendar } from "../../../lib/services/workoutsService";
import type { ApiResponse, CalendarDto } from "../../../types";

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

    // 2. Validate query params przez Zod
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const { start, end, status } = calendarQuerySchema.parse(params);

    // 3. Fetch calendar data (workouts grouped by date)
    const calendar = await getCalendar(
      context.locals.supabase,
      user.id,
      start,
      end,
      status
    );

    // 4. Build response envelope
    const response: ApiResponse<CalendarDto> = { data: calendar };

    // 5. Happy path - zwróć 200 OK
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod (w tym invalid date range)
    if (err.name === "ZodError") {
      console.warn("GET /api/v1/calendar - validation error", {
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

    // Błędy serwerowe/DB
    console.error("GET /api/v1/calendar failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
