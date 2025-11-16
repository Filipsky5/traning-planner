/**
 * User Goals Service Layer
 *
 * Zarządza operacjami CRUD dla celów użytkownika (user_goals table).
 * W MVP każdy użytkownik może mieć dokładnie jeden cel typu "distance_by_date".
 *
 * Analogia do iOS: Podobne do Repository pattern w Swift (warstwa biznesowa)
 * - Separacja logiki od API routes (Single Responsibility)
 * - Type-safe operacje na bazie danych
 * - Ownership verification (user_id filtering)
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { UserGoalDto } from "../../types";
import type { UserGoalUpsertInput } from "../validation/userGoals";

/**
 * Get current user goal or null if not set
 *
 * @param supabase - Supabase client z context.locals
 * @param userId - ID użytkownika z auth.users
 * @returns UserGoalDto | null
 */
export async function getUserGoal(supabase: SupabaseClient, userId: string): Promise<UserGoalDto | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("goal_type, target_distance_m, due_date, notes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data as UserGoalDto | null;
}

/**
 * Create or replace user goal (upsert)
 *
 * Używa ON CONFLICT (user_id) DO UPDATE - atomic operation.
 * Jeśli cel istnieje - zastępuje go nowym, jeśli nie - tworzy.
 *
 * @param supabase - Supabase client z context.locals
 * @param userId - ID użytkownika z auth.users
 * @param command - Zwalidowane dane celu (z Zod schema)
 * @returns UserGoalDto - utworzony/zaktualizowany cel
 */
export async function upsertUserGoal(
  supabase: SupabaseClient,
  userId: string,
  command: UserGoalUpsertInput
): Promise<UserGoalDto> {
  const { data, error } = await supabase
    .from("user_goals")
    .upsert(
      {
        user_id: userId,
        goal_type: command.goal_type,
        target_distance_m: command.target_distance_m,
        due_date: command.due_date,
        notes: command.notes || null,
      },
      { onConflict: "user_id" }
    )
    .select("goal_type, target_distance_m, due_date, notes")
    .single();

  if (error) throw error;

  return data as UserGoalDto;
}

/**
 * Delete user goal
 *
 * Weryfikuje czy cel istnieje przed usunięciem.
 * Rzuca "GOAL_NOT_FOUND" jeśli cel nie istnieje (API zwróci 404).
 *
 * @param supabase - Supabase client z context.locals
 * @param userId - ID użytkownika z auth.users
 * @throws Error("GOAL_NOT_FOUND") jeśli cel nie istnieje
 */
export async function deleteUserGoal(supabase: SupabaseClient, userId: string): Promise<void> {
  // Check if goal exists
  const { count } = await supabase.from("user_goals").select("*", { count: "exact", head: true }).eq("user_id", userId);

  if (count === 0) {
    throw new Error("GOAL_NOT_FOUND");
  }

  // Delete goal
  const { error } = await supabase.from("user_goals").delete().eq("user_id", userId);

  if (error) throw error;
}
