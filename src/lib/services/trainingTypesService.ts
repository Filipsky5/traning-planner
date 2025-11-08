import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { TrainingTypeDto } from "../../types";

/**
 * Pobiera listę typów treningów z bazy danych Supabase.
 *
 * Analogia do iOS: Podobne do fetchowania danych z Firebase Firestore/Realtime Database.
 * Różnica: Supabase używa PostgreSQL, więc mamy relacyjną bazę z SQL queries.
 *
 * @param supabase - Klient Supabase (z context.locals w Astro API route)
 * @param includeInactive - Czy zwracać również nieaktywne typy treningów
 * @returns Promise z tablicą TrainingTypeDto
 * @throws Rzuca błąd Supabase jeśli zapytanie się nie powiedzie
 *
 * @example
 * // W endpoint API:
 * const types = await listTrainingTypes(context.locals.supabase, false);
 */
export async function listTrainingTypes(
  supabase: SupabaseClient<Database>,
  includeInactive: boolean
): Promise<TrainingTypeDto[]> {
  // Budujemy base query - select tylko potrzebnych kolumn
  // Sortowanie po 'code' zapewnia deterministyczną kolejność (ważne dla ETag)
  const base = supabase
    .from("training_types")
    .select("code,name,is_active,created_at")
    .order("code", { ascending: true });

  // Conditional query: jeśli nie includeInactive, filtruj tylko aktywne
  // Podobne do używania .where() w Firebase queries
  const query = includeInactive ? base : base.eq("is_active", true);

  // Wykonaj query - zwraca { data, error }
  const { data, error } = await query;

  // Guard clause: obsługa błędu na początku (early return pattern)
  if (error) throw error;

  // Zwróć dane jako TrainingTypeDto[]
  // Type cast jest bezpieczny, bo select wybiera dokładnie te kolumny co DTO
  return (data ?? []) as unknown as TrainingTypeDto[];
}
