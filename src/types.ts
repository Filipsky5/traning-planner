import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ------------------------------------------------------------
// Generic API response envelopes
// ------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
}
export interface ApiListResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}

// ------------------------------------------------------------
// Workout step types (mapping to steps_jsonb)
// ------------------------------------------------------------
export type StepPart = "warmup" | "main" | "cooldown" | "segment";

export interface WorkoutStepDto {
  part: StepPart;
  distance_m?: number;
  duration_s?: number;
  notes?: string;
}
// Note: "anyOf" (at least one of distance_m or duration_s) cannot be fully
// represented in TypeScript – enforce it in the runtime validation layer.

// ------------------------------------------------------------
// Training Types
// ------------------------------------------------------------
type TrainingTypeRow = Tables<"training_types">;

export type TrainingTypeDto = Pick<TrainingTypeRow, "code" | "name" | "is_active" | "created_at">;

// ------------------------------------------------------------
// Workouts – DTO
// ------------------------------------------------------------
type WorkoutRow = Tables<"workouts">;
type WorkoutInsert = TablesInsert<"workouts">;
type WorkoutUpdate = TablesUpdate<"workouts">;

export type WorkoutSummaryDto = Pick<
  WorkoutRow,
  | "id"
  | "training_type_code"
  | "planned_date"
  | "position"
  | "planned_distance_m"
  | "planned_duration_s"
  | "status"
  | "origin"
  | "rating"
  | "avg_pace_s_per_km"
>;

export type WorkoutDetailDto = Omit<WorkoutRow, "steps_jsonb"> & {
  steps: WorkoutStepDto[];
};

export type WorkoutLast3ItemDto = Pick<WorkoutRow, "id" | "completed_at" | "training_type_code">;

export type CalendarWorkoutItemDto = Pick<WorkoutRow, "id" | "training_type_code" | "status" | "position">;

export interface CalendarDayDto {
  date: string; // YYYY-MM-DD (UTC)
  workouts: CalendarWorkoutItemDto[];
}

export interface CalendarDto {
  range: { start: string; end: string }; // YYYY-MM-DD (UTC)
  days: CalendarDayDto[];
}

// ------------------------------------------------------------
// Workouts – Commands
// ------------------------------------------------------------
export type WorkoutCreatePlannedCommand = Pick<
  WorkoutInsert,
  "training_type_code" | "planned_date" | "position" | "planned_distance_m" | "planned_duration_s"
> & {
  steps: WorkoutStepDto[];
};

export type WorkoutCreateCompletedCommand = Pick<
  WorkoutInsert,
  | "training_type_code"
  | "planned_date"
  | "position"
  | "planned_distance_m"
  | "planned_duration_s"
  | "distance_m"
  | "duration_s"
  | "avg_hr_bpm"
  | "completed_at"
  | "rating"
> & {
  // status must always be "completed" for this command
  status: Extract<Enums<"workout_status">, "completed">;
  // In the API plan, examples may omit steps; DB requires steps_jsonb —
  // the API may provide defaults, so we keep it optional.
  steps?: WorkoutStepDto[];
};

export type WorkoutUpdateCommand = Partial<
  Omit<WorkoutUpdate, "id" | "user_id" | "origin" | "ai_suggestion_id" | "avg_pace_s_per_km" | "steps_jsonb">
> & {
  steps?: WorkoutStepDto[];
};

export type WorkoutCompleteCommand = Pick<
  WorkoutUpdate,
  "distance_m" | "duration_s" | "avg_hr_bpm" | "completed_at"
> & {
  rating?: Enums<"workout_rating">;
};

export type WorkoutSkipCommand = Record<string, never>;
export type WorkoutCancelCommand = Record<string, never>;
export interface WorkoutRateCommand {
  rating: Enums<"workout_rating">;
}

// ------------------------------------------------------------
// AI Suggestions – DTO and Commands
// ------------------------------------------------------------
type AiSuggestionRow = Tables<"ai_suggestions">;

export type AiSuggestionDto = Omit<AiSuggestionRow, "steps_jsonb"> & {
  steps: WorkoutStepDto[];
  // Computed in API as created_at + 24h
  expires_at: string; // ISO 8601
  // API-level field (may not exist in the current DB typings)
  planned_date: string; // YYYY-MM-DD (UTC)
};

export interface AiSuggestionCreateCommand {
  planned_date: string; // YYYY-MM-DD (UTC)
  training_type_code: AiSuggestionRow["training_type_code"];
  context?: Record<string, unknown>;
}

export interface AiSuggestionAcceptCommand {
  position: number;
}
export type AiSuggestionRejectCommand = Record<string, never>;
export interface AiSuggestionRegenerateCommand {
  reason?: string;
  adjustment_hint?: string;
}

type AiSuggestionEventRow = Tables<"ai_suggestion_events">;
export type AiSuggestionEventDto = Pick<AiSuggestionEventRow, "id" | "kind" | "occurred_at" | "metadata">;

// ------------------------------------------------------------
// User Goal – DTO and Commands
// ------------------------------------------------------------
type UserGoalRow = Tables<"user_goals">;

export type UserGoalDto = Pick<UserGoalRow, "goal_type" | "target_distance_m" | "due_date" | "notes">;

export type UserGoalUpsertCommand = UserGoalDto;

// ------------------------------------------------------------
// AI Logs (internal) – DTO and Commands
// ------------------------------------------------------------
type AiLogRow = Tables<"ai_logs">;
type AiLogInsert = TablesInsert<"ai_logs">;

export type AiLogDto = Pick<
  AiLogRow,
  | "id"
  | "event"
  | "level"
  | "model"
  | "provider"
  | "latency_ms"
  | "input_tokens"
  | "output_tokens"
  | "cost_usd"
  | "payload"
  | "created_at"
  | "user_id"
>;

export type AiLogIngestCommand = Omit<AiLogInsert, "id" | "created_at">;
