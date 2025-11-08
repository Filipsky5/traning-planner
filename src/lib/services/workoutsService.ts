/**
 * Workouts Service Layer
 *
 * Analogia do iOS: Service/Repository pattern (jak NetworkService w iOS apps)
 * - Separation of concerns: business logic oddzielona od API endpoints
 * - Reusable: funkcje mogą być używane przez różne endpoints
 * - Testable: łatwe mockowanie dla unit tests
 * - Type-safe: TypeScript zapewnia bezpieczeństwo typów
 *
 * Features:
 * - Ownership verification (user może operować tylko na swoich workouts)
 * - Steps transformation (JSONB ↔ WorkoutStepDto[])
 * - avg_pace calculation (automatic)
 * - Error handling (custom errors dla różnych scenariuszy)
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  WorkoutSummaryDto,
  WorkoutDetailDto,
  WorkoutLast3ItemDto,
  CalendarDto,
  WorkoutStepDto
} from "../../types";
import type {
  ListQuery,
  CreateWorkoutInput,
  UpdateWorkoutInput,
  CompleteWorkoutInput,
  RateWorkoutInput
} from "../validation/workouts";

// Helper: Transform steps_jsonb (JSONB in DB) to WorkoutStepDto[] (typed array)
// Analogia do iOS: Jak Codable decoding z custom format
function transformSteps(steps_jsonb: any): WorkoutStepDto[] {
  if (!steps_jsonb) return [];
  return Array.isArray(steps_jsonb) ? steps_jsonb : [];
}

// Note: avg_pace_s_per_km calculation is now handled by DB as GENERATED ALWAYS column
// Formula used by DB: duration_s / (distance_m / 1000)
// No need for manual calculation in application code

/**
 * 1. List workouts with filters and pagination
 *
 * Features:
 * - Multi-column filtering (status, type, origin, rating, date ranges)
 * - Dynamic sorting (default depends on status filter)
 * - Pagination (page, per_page)
 * - Efficient: SELECT tylko summary fields (bez steps dla performance)
 */
export async function listWorkouts(
  supabase: SupabaseClient,
  userId: string,
  filters: ListQuery
): Promise<{ data: WorkoutSummaryDto[]; total: number }> {
  // Base query: SELECT summary fields only (no steps_jsonb for performance)
  let query = supabase
    .from("workouts")
    .select(
      "id,training_type_code,planned_date,position,planned_distance_m,planned_duration_s,status,origin,rating,avg_pace_s_per_km",
      { count: "exact" }
    )
    .eq("user_id", userId);

  // Apply filters (guard pattern - skip if undefined)
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.training_type_code) {
    query = query.in("training_type_code", filters.training_type_code);
  }
  if (filters.origin) {
    query = query.eq("origin", filters.origin);
  }
  if (filters.rating) {
    query = query.eq("rating", filters.rating);
  }
  if (filters.planned_date_gte) {
    query = query.gte("planned_date", filters.planned_date_gte);
  }
  if (filters.planned_date_lte) {
    query = query.lte("planned_date", filters.planned_date_lte);
  }
  if (filters.completed_at_gte) {
    query = query.gte("completed_at", filters.completed_at_gte);
  }
  if (filters.completed_at_lte) {
    query = query.lte("completed_at", filters.completed_at_lte);
  }

  // Sorting: default depends on status filter
  // - completed workouts: sort by completed_at DESC (newest first)
  // - planned workouts: sort by planned_date ASC, position ASC (chronological)
  const sort = filters.sort || (filters.status === "completed" ? "completed_at:desc" : "planned_date:asc,position:asc");
  const sortParts = sort.split(",");
  sortParts.forEach((part) => {
    const [field, order] = part.split(":");
    query = query.order(field, { ascending: order === "asc" });
  });

  // Pagination (range is 0-indexed, inclusive)
  const from = (filters.page - 1) * filters.per_page;
  const to = from + filters.per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as WorkoutSummaryDto[],
    total: count ?? 0
  };
}

/**
 * 2. Get workout by ID with ownership verification
 *
 * Security:
 * - Ownership check: WHERE user_id=? (RLS jako backup)
 * - NOT_FOUND error jeśli workout nie istnieje lub nie należy do użytkownika
 */
export async function getWorkoutById(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .single();

  // Guard: workout nie istnieje lub nie należy do użytkownika
  if (error) {
    if (error.code === "PGRST116") throw new Error("NOT_FOUND");
    throw error;
  }
  if (!data) throw new Error("NOT_FOUND");

  // Transform steps_jsonb → steps (typed array)
  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 3. Create workout (planned or completed)
 *
 * Features:
 * - FK validation: training_type_code must exist
 * - Uniqueness check: (user_id, planned_date, position) unique
 * - Auto-calculation: avg_pace_s_per_km for completed workouts
 * - Origin: always "manual" (AI uses different endpoint)
 */
export async function createWorkout(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWorkoutInput
): Promise<WorkoutDetailDto> {
  // Guard: check training_type_code exists (FK validation)
  const { data: typeExists } = await supabase
    .from("training_types")
    .select("code")
    .eq("code", input.training_type_code)
    .single();

  if (!typeExists) throw new Error("INVALID_TRAINING_TYPE");

  // Build insert object
  // Note: avg_pace_s_per_km is a GENERATED ALWAYS column in DB - it's calculated automatically
  const insertData = {
    user_id: userId,
    training_type_code: input.training_type_code,
    planned_date: input.planned_date,
    position: input.position,
    planned_distance_m: input.planned_distance_m,
    planned_duration_s: input.planned_duration_s,
    steps_jsonb: input.steps,
    status: input.status || "planned",
    origin: "manual" as const,
    distance_m: input.distance_m ?? null,
    duration_s: input.duration_s ?? null,
    avg_hr_bpm: input.avg_hr_bpm ?? null,
    completed_at: input.completed_at ?? null,
    rating: input.rating ?? null
  };

  const { data, error } = await supabase
    .from("workouts")
    .insert(insertData)
    .select("*")
    .single();

  // Guard: duplicate position error
  if (error) {
    if (error.code === "23505") throw new Error("DUPLICATE_POSITION");
    throw error;
  }

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 4. Update workout (partial update)
 *
 * Features:
 * - Ownership verification (via getWorkoutById)
 * - Immutable fields: protected by Zod strict mode
 * - Auto-recalculate avg_pace if distance/duration changed
 */
export async function updateWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
  input: UpdateWorkoutInput
): Promise<WorkoutDetailDto> {
  // Get current workout (ownership check + ensure exists)
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Build update object (only changed fields)
  const updateData: any = {};
  if (input.planned_distance_m !== undefined) updateData.planned_distance_m = input.planned_distance_m;
  if (input.planned_duration_s !== undefined) updateData.planned_duration_s = input.planned_duration_s;
  if (input.steps !== undefined) updateData.steps_jsonb = input.steps;
  if (input.distance_m !== undefined) updateData.distance_m = input.distance_m;
  if (input.duration_s !== undefined) updateData.duration_s = input.duration_s;
  if (input.avg_hr_bpm !== undefined) updateData.avg_hr_bpm = input.avg_hr_bpm;
  if (input.completed_at !== undefined) updateData.completed_at = input.completed_at;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.status !== undefined) updateData.status = input.status;

  // Note: avg_pace_s_per_km is a GENERATED ALWAYS column - DB recalculates it automatically
  // when distance_m or duration_s changes. No manual update needed.

  const { data, error } = await supabase
    .from("workouts")
    .update(updateData)
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 5. Delete workout with FK constraint check
 *
 * FK constraint: Cannot delete workout if it's referenced by accepted AI suggestion
 * Error: FK_CONSTRAINT → 409 Conflict with remediation hint
 */
export async function deleteWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<void> {
  // Check ownership first (throw NOT_FOUND if not exists or not owner)
  await getWorkoutById(supabase, userId, workoutId);

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", userId);

  // Guard: FK constraint violation (workout created from accepted AI suggestion)
  if (error) {
    if (error.code === "23503") throw new Error("FK_CONSTRAINT");
    throw error;
  }
}

/**
 * 6. Complete workout (domain action)
 *
 * Status transition: planned → completed
 * Features:
 * - Guard: already completed → 409
 * - Auto-calculate avg_pace
 * - Set status=completed + metrics
 */
export async function completeWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
  input: CompleteWorkoutInput
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Guard: already completed
  if (current.status === "completed") {
    throw new Error("ALREADY_COMPLETED");
  }

  // Note: avg_pace_s_per_km is calculated automatically by DB based on distance_m and duration_s
  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "completed",
      distance_m: input.distance_m,
      duration_s: input.duration_s,
      avg_hr_bpm: input.avg_hr_bpm,
      completed_at: input.completed_at,
      rating: input.rating ?? null
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 7. Skip workout (domain action)
 *
 * Status transition: any → skipped
 * Clear all metrics (distance, duration, hr, completed_at, rating, avg_pace)
 */
export async function skipWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Guard: already skipped
  if (current.status === "skipped") {
    throw new Error("ALREADY_SKIPPED");
  }

  // Note: avg_pace_s_per_km will be NULL automatically when distance_m/duration_s are NULL
  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "skipped",
      distance_m: null,
      duration_s: null,
      avg_hr_bpm: null,
      completed_at: null,
      rating: null
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 8. Cancel workout (domain action)
 *
 * Status transition: any → canceled
 * Clear all metrics
 */
export async function cancelWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Guard: already canceled
  if (current.status === "canceled") {
    throw new Error("ALREADY_CANCELED");
  }

  // Note: avg_pace_s_per_km will be NULL automatically when distance_m/duration_s are NULL
  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "canceled",
      distance_m: null,
      duration_s: null,
      avg_hr_bpm: null,
      completed_at: null,
      rating: null
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 9. Rate workout (domain action)
 *
 * Guard: only completed workouts can be rated
 * Update rating field only
 */
export async function rateWorkout(
  supabase: SupabaseClient,
  userId: string,
  workoutId: string,
  input: RateWorkoutInput
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Guard: can only rate completed workouts
  if (current.status !== "completed") {
    throw new Error("NOT_COMPLETED");
  }

  const { data, error } = await supabase
    .from("workouts")
    .update({ rating: input.rating })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb)
  } as WorkoutDetailDto;
}

/**
 * 10. Get last 3 completed workouts (for AI context)
 *
 * Features:
 * - Always status=completed
 * - Optional filter by training_type_code
 * - ORDER BY completed_at DESC LIMIT 3
 * - Minimal payload (id, completed_at, training_type_code)
 * - Uses index: (user_id, training_type_code, completed_at DESC)
 */
export async function getLastThreeWorkouts(
  supabase: SupabaseClient,
  userId: string,
  trainingTypeCode?: string
): Promise<WorkoutLast3ItemDto[]> {
  let query = supabase
    .from("workouts")
    .select("id,completed_at,training_type_code")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(3);

  if (trainingTypeCode) {
    query = query.eq("training_type_code", trainingTypeCode);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as WorkoutLast3ItemDto[];
}

/**
 * 11. Get calendar view (workouts grouped by date)
 *
 * Features:
 * - Date range filter (start, end)
 * - Optional status filter
 * - Minimal payload per workout (id, type, status, position)
 * - Group by planned_date (in application, not SQL)
 * - Uses index: (user_id, planned_date)
 */
export async function getCalendar(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string,
  status?: string
): Promise<CalendarDto> {
  let query = supabase
    .from("workouts")
    .select("id,training_type_code,status,position,planned_date")
    .eq("user_id", userId)
    .gte("planned_date", start)
    .lte("planned_date", end)
    .order("planned_date", { ascending: true })
    .order("position", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by date (in JavaScript, not SQL - simpler and works with any DB)
  const grouped = new Map<string, any[]>();
  (data ?? []).forEach((workout) => {
    const date = workout.planned_date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push({
      id: workout.id,
      training_type_code: workout.training_type_code,
      status: workout.status,
      position: workout.position
    });
  });

  // Convert Map to array of CalendarDayDto
  const days = Array.from(grouped.entries()).map(([date, workouts]) => ({
    date,
    workouts
  }));

  return {
    range: { start, end },
    days
  };
}
