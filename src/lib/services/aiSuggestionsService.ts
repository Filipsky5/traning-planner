import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type {
  AiSuggestionAcceptCommand,
  AiSuggestionCreateCommand,
  AiSuggestionDto,
  AiSuggestionEventDto,
  AiSuggestionRegenerateCommand,
  WorkoutStepDto,
  WorkoutDetailDto,
} from "../../types";
import { createApiError } from "../http/errors";
import { recordSuggestionEvent } from "./aiSuggestionEventsService";
import { generateSuggestion } from "./aiEngine";

export interface ListSuggestionsFilters {
  status?: Database["public"]["Enums"]["ai_suggestion_status"];
  created_after?: string;
  created_before?: string;
  page?: number;
  per_page?: number;
  sort?: string;
}

export interface ListSuggestionsResult {
  data: AiSuggestionDto[];
  page: number;
  perPage: number;
  total: number;
}

export interface SuggestionWithEvents {
  suggestion: AiSuggestionDto;
  events: AiSuggestionEventDto[];
}

export interface ListEventsFilters {
  page: number;
  per_page: number;
}

export interface ListEventsResult {
  data: AiSuggestionEventDto[];
  page: number;
  perPage: number;
  total: number;
}

const DAILY_LIMIT = 3;
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

const SUGGESTION_SELECT =
  "id,user_id,training_type_code,status,planned_date,steps_jsonb,accepted_workout_id,created_at,updated_at";
const EVENT_SELECT = "id,kind,occurred_at,metadata";
const WORKOUT_SELECT =
  "id,user_id,training_type_code,planned_date,position,planned_distance_m,planned_duration_s,status,origin,rating,avg_pace_s_per_km,distance_m,duration_s,avg_hr_bpm,completed_at,created_at,updated_at,ai_suggestion_id,steps_jsonb";

type SuggestionRow = Database["public"]["Tables"]["ai_suggestions"]["Row"];
type SuggestionInsert = Database["public"]["Tables"]["ai_suggestions"]["Insert"];
type WorkoutRow = Database["public"]["Tables"]["workouts"]["Row"];

export async function listSuggestions(
  supabase: SupabaseClient,
  userId: string,
  filters: ListSuggestionsFilters
): Promise<ListSuggestionsResult> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("ai_suggestions")
    .select(SUGGESTION_SELECT, { count: "exact" })
    .eq("user_id", userId);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.created_after) {
    const start = startOfDayUtc(filters.created_after);
    query = query.gte("created_at", start.toISOString());
  }

  if (filters.created_before) {
    const end = endOfDayUtc(filters.created_before);
    query = query.lte("created_at", end.toISOString());
  }

  const sort = parseSort(filters.sort ?? "created_at:desc");
  query = query.order(sort.column, { ascending: sort.direction === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw createApiError(500, "internal_error", "Failed to list AI suggestions", { cause: error });
  }

  const items = (data ?? []).map(mapSuggestionRow);

  return {
    data: items,
    page,
    perPage,
    total: count ?? items.length,
  };
}

export async function createSuggestion(
  supabase: SupabaseClient,
  userId: string,
  command: AiSuggestionCreateCommand
): Promise<SuggestionWithEvents> {
  await assertTrainingTypeExists(supabase, command.training_type_code);
  await assertDailyLimitNotExceeded(supabase, userId, command.planned_date);

  const aiOutput = await generateSuggestion(userId, command);
  const steps = aiOutput.steps ?? [];
  const aggregates = aggregateSteps(steps);
  const meta = buildSuggestionMeta({
    plannedDate: command.planned_date,
    aggregates,
    contextSource: command.context,
    aiMetadata: aiOutput.metadata,
  });

  const suggestionPayload: SuggestionInsert = {
    user_id: userId,
    training_type_code: command.training_type_code,
    status: "shown",
    planned_date: command.planned_date,
    steps_jsonb: buildSuggestionStepsPayload(meta, steps),
  };

  const { data, error } = await supabase
    .from("ai_suggestions")
    .insert(suggestionPayload)
    .select(SUGGESTION_SELECT)
    .single();

  if (error || !data) {
    throw createApiError(500, "internal_error", "Failed to create AI suggestion", { cause: error });
  }

  const suggestion = mapSuggestionRow(data);
  const events = await fetchSuggestionEvents(supabase, userId, data.id);

  return { suggestion, events };
}

export async function getSuggestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  includeExpired: boolean
): Promise<SuggestionWithEvents> {
  const row = await fetchSuggestionRow(supabase, userId, id);
  if (!includeExpired && isExpired(row)) {
    throw createApiError(410, "gone", "AI suggestion has expired");
  }

  const suggestion = mapSuggestionRow(row);
  const events = await fetchSuggestionEvents(supabase, userId, id);
  return { suggestion, events };
}

export async function acceptSuggestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  command: AiSuggestionAcceptCommand
): Promise<{ suggestion: AiSuggestionDto; workout: WorkoutDetailDto }> {
  const suggestionRow = await fetchSuggestionRow(supabase, userId, id);
  const parsedPayload = parseSuggestionPayload(suggestionRow.steps_jsonb);
  const plannedDate = suggestionRow.planned_date;

  if (suggestionRow.status !== "shown") {
    throw createApiError(409, "conflict", "AI suggestion is no longer available for acceptance", {
      details: { status: suggestionRow.status },
    });
  }

  if (isExpired(suggestionRow)) {
    throw createApiError(410, "gone", "AI suggestion has expired");
  }

  if (suggestionRow.accepted_workout_id) {
    throw createApiError(409, "conflict", "AI suggestion is already linked to a workout");
  }

  const aggregates = aggregateSteps(parsedPayload.steps);
  const plannedDistance = parsedPayload.meta.planned_distance_m ?? aggregates.distance;
  const plannedDuration = parsedPayload.meta.planned_duration_s ?? aggregates.duration;

  if (!plannedDistance || !plannedDuration) {
    throw createApiError(
      500,
      "internal_error",
      `AI suggestion payload missing distance or duration (distance: ${plannedDistance}, duration: ${plannedDuration}). This should not happen with updated AI schema.`
    );
  }

  const workoutInsert = {
    user_id: userId,
    training_type_code: suggestionRow.training_type_code,
    planned_date: plannedDate,
    position: command.position,
    planned_distance_m: plannedDistance,
    planned_duration_s: plannedDuration,
    status: "planned" as Database["public"]["Enums"]["workout_status"],
    origin: "ai" as Database["public"]["Enums"]["workout_origin"],
    steps_jsonb: parsedPayload.steps,
    ai_suggestion_id: suggestionRow.id,
  };

  const { data: workoutData, error: workoutError } = await supabase
    .from("workouts")
    .insert(workoutInsert)
    .select(WORKOUT_SELECT)
    .single();

  if (workoutError || !workoutData) {
    if (workoutError?.code === "23505") {
      throw createApiError(409, "conflict", "Workout position already taken for this date", { cause: workoutError });
    }

    throw createApiError(500, "internal_error", "Failed to create workout from AI suggestion", {
      cause: workoutError,
    });
  }

  const { data: updatedSuggestion, error: updateError } = await supabase
    .from("ai_suggestions")
    .update({
      status: "accepted",
      accepted_workout_id: workoutData.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionRow.id)
    .eq("user_id", userId)
    .select(SUGGESTION_SELECT)
    .single();

  if (updateError || !updatedSuggestion) {
    // Attempt to rollback workout creation to maintain consistency
    await supabase.from("workouts").delete().eq("id", workoutData.id).eq("user_id", userId);
    throw createApiError(500, "internal_error", "Failed to finalize AI suggestion acceptance", {
      cause: updateError,
    });
  }

  const suggestion = mapSuggestionRow(updatedSuggestion);
  const workout = mapWorkoutRow(workoutData);
  return { suggestion, workout };
}

export async function rejectSuggestion(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<SuggestionWithEvents> {
  const suggestionRow = await fetchSuggestionRow(supabase, userId, id);

  if (suggestionRow.status !== "shown") {
    throw createApiError(409, "conflict", "AI suggestion cannot be rejected in its current state", {
      details: { status: suggestionRow.status },
    });
  }

  if (isExpired(suggestionRow)) {
    throw createApiError(410, "gone", "AI suggestion has expired");
  }

  const { data, error } = await supabase
    .from("ai_suggestions")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionRow.id)
    .eq("user_id", userId)
    .select(SUGGESTION_SELECT)
    .single();

  if (error || !data) {
    throw createApiError(500, "internal_error", "Failed to reject AI suggestion", { cause: error });
  }

  const suggestion = mapSuggestionRow(data);
  const events = await fetchSuggestionEvents(supabase, userId, id);
  return { suggestion, events };
}

export async function regenerateSuggestion(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  command: AiSuggestionRegenerateCommand
): Promise<SuggestionWithEvents> {
  const baseSuggestion = await fetchSuggestionRow(supabase, userId, id);
  const basePayload = parseSuggestionPayload(baseSuggestion.steps_jsonb);

  if (baseSuggestion.status === "accepted") {
    throw createApiError(409, "conflict", "Accepted suggestions cannot be regenerated");
  }

  if (isExpired(baseSuggestion)) {
    throw createApiError(410, "gone", "AI suggestion has expired");
  }

  await assertDailyLimitNotExceeded(supabase, userId, baseSuggestion.planned_date);

  const aiInput: AiSuggestionCreateCommand = {
    planned_date: baseSuggestion.planned_date,
    training_type_code: baseSuggestion.training_type_code,
    context: {
      ...(basePayload.meta.context ?? {}),
      regenerate_reason: command.reason,
      adjustment_hint: command.adjustment_hint,
      source_suggestion_id: id,
    },
  };

  const aiOutput = await generateSuggestion(userId, aiInput);
  const steps = aiOutput.steps ?? [];
  const aggregates = aggregateSteps(steps);
  const meta = buildSuggestionMeta({
    plannedDate: aiInput.planned_date,
    aggregates,
    contextSource: aiInput.context,
    aiMetadata: aiOutput.metadata,
  });

  const insertPayload: SuggestionInsert = {
    user_id: userId,
    training_type_code: baseSuggestion.training_type_code,
    status: "shown",
    planned_date: baseSuggestion.planned_date,
    steps_jsonb: buildSuggestionStepsPayload(meta, steps),
  };

  const { data: newSuggestion, error: insertError } = await supabase
    .from("ai_suggestions")
    .insert(insertPayload)
    .select(SUGGESTION_SELECT)
    .single();

  if (insertError || !newSuggestion) {
    throw createApiError(500, "internal_error", "Failed to regenerate AI suggestion", { cause: insertError });
  }

  const { error: updateBaseError } = await supabase
    .from("ai_suggestions")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", baseSuggestion.id)
    .eq("user_id", userId);

  if (updateBaseError) {
    console.warn("Failed to update base suggestion status during regeneration", updateBaseError);
  }

  await recordSuggestionEvent(supabase, {
    suggestionId: baseSuggestion.id,
    userId,
    metadata: {
      new_suggestion_id: newSuggestion.id,
      reason: command.reason,
      adjustment_hint: command.adjustment_hint,
    },
  });

  const suggestion = mapSuggestionRow(newSuggestion);
  const events = await fetchSuggestionEvents(supabase, userId, newSuggestion.id);
  return { suggestion, events };
}

function mapSuggestionRow(row: SuggestionRow): AiSuggestionDto {
  const { steps_jsonb, ...rest } = row;
  const parsed = parseSuggestionPayload(steps_jsonb);

  return {
    ...rest,
    steps: parsed.steps,
    expires_at: computeExpiresAt(row.created_at),
    planned_date: row.planned_date,
  };
}

function mapWorkoutRow(row: WorkoutRow): WorkoutDetailDto {
  const { steps_jsonb, ...rest } = row;
  return {
    ...rest,
    steps: parseSteps(steps_jsonb),
  };
}

function parseSteps(payload: unknown): WorkoutStepDto[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const step: WorkoutStepDto = {
        part: (isStepPart(item.part) ? item.part : "segment") as WorkoutStepDto["part"],
      };

      if (typeof item.distance_m === "number") {
        step.distance_m = item.distance_m;
      }

      if (typeof item.duration_s === "number") {
        step.duration_s = item.duration_s;
      }

      if (typeof item.notes === "string" && item.notes.trim().length > 0) {
        step.notes = item.notes;
      }

      return step;
    });
}

function isStepPart(value: unknown): value is WorkoutStepDto["part"] {
  return value === "warmup" || value === "main" || value === "cooldown" || value === "segment";
}

function computeExpiresAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + EXPIRATION_MS).toISOString();
}

function isExpired(row: SuggestionRow): boolean {
  if (row.status === "expired") {
    return true;
  }

  return Date.now() >= new Date(row.created_at).getTime() + EXPIRATION_MS;
}

function aggregateSteps(steps: WorkoutStepDto[]): { distance: number; duration: number } {
  return steps.reduce(
    (acc, step) => {
      if (typeof step.distance_m === "number") {
        acc.distance += step.distance_m;
      }
      if (typeof step.duration_s === "number") {
        acc.duration += step.duration_s;
      }
      return acc;
    },
    { distance: 0, duration: 0 }
  );
}

function mergeContexts(
  ...contexts: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = {};
  let hasValue = false;

  contexts.forEach((context) => {
    if (context && typeof context === "object") {
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined) {
          merged[key] = value;
          hasValue = true;
        }
      });
    }
  });

  return hasValue ? merged : undefined;
}

async function assertTrainingTypeExists(supabase: SupabaseClient, code: string): Promise<void> {
  const { data, error } = await supabase
    .from("training_types")
    .select("code")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw createApiError(500, "internal_error", "Failed to verify training type", { cause: error });
  }

  if (!data) {
    throw createApiError(400, "validation_error", "Unknown training_type_code", {
      details: { training_type_code: code },
    });
  }
}

async function assertDailyLimitNotExceeded(
  supabase: SupabaseClient,
  userId: string,
  plannedDate: string
): Promise<void> {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);

  const { count, error } = await supabase
    .from("ai_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("planned_date", plannedDate)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) {
    throw createApiError(500, "internal_error", "Failed to evaluate daily AI suggestion limit", { cause: error });
  }

  if ((count ?? 0) >= DAILY_LIMIT) {
    throw createApiError(
      429,
      "too_many_requests",
      `Daily limit (${DAILY_LIMIT}) for AI suggestions reached for date ${plannedDate}`
    );
  }
}

export async function fetchSuggestionRow(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<SuggestionRow> {
  const { data, error } = await supabase
    .from("ai_suggestions")
    .select(SUGGESTION_SELECT)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw createApiError(500, "internal_error", "Failed to load AI suggestion", { cause: error });
  }

  if (!data) {
    throw createApiError(404, "not_found", "AI suggestion not found");
  }

  return data;
}

async function fetchSuggestionEvents(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<AiSuggestionEventDto[]> {
  const { data, error } = await supabase
    .from("ai_suggestion_events")
    .select(EVENT_SELECT)
    .eq("user_id", userId)
    .eq("ai_suggestion_id", id)
    .order("occurred_at", { ascending: false });

  if (error) {
    throw createApiError(500, "internal_error", "Failed to load AI suggestion events", { cause: error });
  }

  return (data ?? []).map((event) => ({
    id: event.id,
    kind: event.kind,
    occurred_at: event.occurred_at,
    metadata: event.metadata,
  }));
}

/**
 * List AI suggestion events with pagination
 * Used by GET /api/v1/ai/suggestions/{id}/events endpoint
 *
 * Note: Uses separate queries for count and data due to PostgREST bug with count + range
 */
export async function listSuggestionEvents(
  supabase: SupabaseClient,
  userId: string,
  suggestionId: string,
  filters: ListEventsFilters
): Promise<ListEventsResult> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // 1. COUNT QUERY (separate from data query to avoid PostgREST bug)
  const { count, error: countError } = await supabase
    .from("ai_suggestion_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("ai_suggestion_id", suggestionId);

  if (countError) {
    throw createApiError(500, "internal_error", "Failed to count events", { cause: countError });
  }

  // 2. DATA QUERY (with pagination)
  const { data, error: dataError } = await supabase
    .from("ai_suggestion_events")
    .select(EVENT_SELECT)
    .eq("user_id", userId)
    .eq("ai_suggestion_id", suggestionId)
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (dataError) {
    throw createApiError(500, "internal_error", "Failed to load events", { cause: dataError });
  }

  const items = (data ?? []).map((event) => ({
    id: event.id,
    kind: event.kind,
    occurred_at: event.occurred_at,
    metadata: event.metadata,
  }));

  return {
    data: items,
    page,
    perPage,
    total: count ?? 0,
  };
}

function parseSort(sort: string): { column: string; direction: "asc" | "desc" } {
  const [fieldRaw, directionRaw] = sort.split(":");
  const field = (fieldRaw ?? "created_at") as "created_at" | "planned_date" | "status";
  const direction = directionRaw === "asc" ? "asc" : "desc";
  if (field === "planned_date") {
    return { column: "steps_jsonb->meta->>planned_date", direction };
  }
  return { column: field, direction };
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date): Date {
  const start = startOfDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function startOfDayUtc(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0));
}

function endOfDayUtc(dateStr: string): Date {
  const start = startOfDayUtc(dateStr);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

interface SuggestionMeta {
  planned_date?: string;
  planned_distance_m?: number;
  planned_duration_s?: number;
  context?: Record<string, unknown>;
}

interface SuggestionPayload {
  version?: number;
  meta?: SuggestionMeta | null;
  steps?: unknown;
}

interface ParsedSuggestionPayload {
  steps: WorkoutStepDto[];
  meta: SuggestionMeta;
}

function parseSuggestionPayload(raw: unknown): ParsedSuggestionPayload {
  if (!raw || typeof raw !== "object") {
    return { steps: [], meta: {} };
  }

  const payload = raw as SuggestionPayload;
  const steps = parseSteps(payload.steps ?? []);
  const meta = payload.meta ?? {};

  return { steps, meta };
}

function buildSuggestionStepsPayload(meta: SuggestionMeta, steps: WorkoutStepDto[]): SuggestionPayload {
  return {
    version: 1,
    meta,
    steps,
  };
}

function buildSuggestionMeta(params: {
  plannedDate: string;
  aggregates: { distance: number; duration: number };
  contextSource?: Record<string, unknown>;
  aiMetadata?: Record<string, unknown>;
}): SuggestionMeta {
  // TODO: MVP follow-up – uzupełnić walidację, aby wymagać dystansu/czasu już na etapie generatora/serwisu.
  const context = mergeContexts(params.contextSource, params.aiMetadata);

  return {
    planned_date: params.plannedDate,
    planned_distance_m: params.aggregates.distance || undefined,
    planned_duration_s: params.aggregates.duration || undefined,
    ...(context ? { context } : {}),
  };
}

