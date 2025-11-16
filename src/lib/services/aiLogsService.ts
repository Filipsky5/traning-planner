import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AiLogDto, AiLogIngestCommand } from "../../types";

/**
 * Zapisuje pojedynczy log AI do bazy danych.
 *
 * Ten endpoint jest używany WYŁĄCZNIE server-side przez service-role key
 * do logowania interakcji z AI (OpenRouter) w celach diagnostycznych i rozliczeniowych.
 *
 * Analogia do iOS: Podobne do zapisywania analytics/logów do Firebase Analytics
 * lub własnego systemu telemetrii. Różnica: PostgreSQL (relacyjna baza) zamiast NoSQL.
 *
 * WAŻNE:
 * - Funkcja NIE loguje błędów do ai_logs (circular dependency!)
 * - Rzuca błąd Supabase jeśli insert się nie powiedzie
 * - Payload może zawierać PII - NIE logować go w console.error
 *
 * @param supabase - Klient Supabase (z context.locals w Astro API route)
 * @param command - Dane loga AI do zapisania (bez id i created_at - generowane przez DB)
 * @returns Promise<void> - Funkcja nic nie zwraca, tylko rzuca błąd w przypadku problemu
 * @throws Rzuca błąd Supabase jeśli insert się nie powiedzie
 *
 * @example
 * ```typescript
 * // W endpoint API:
 * await ingestAiLog(context.locals.supabase, {
 *   event: "suggestion.generate",
 *   level: "info",
 *   model: "gpt-4o-mini",
 *   provider: "openrouter",
 *   latency_ms: 450,
 *   input_tokens: 1200,
 *   output_tokens: 300,
 *   cost_usd: 0.015,
 *   payload: { user_id: "uuid", suggestion_id: "uuid" }
 * });
 * ```
 */
export async function ingestAiLog(supabase: SupabaseClient<Database>, command: AiLogIngestCommand): Promise<void> {
  // Insert do tabeli ai_logs
  // Kolumny id i created_at są generowane automatycznie przez bazę danych
  // Pola opcjonalne konwertujemy na null (PostgreSQL wymaga null, nie undefined)
  const { error } = await supabase.from("ai_logs").insert({
    event: command.event,
    level: command.level,
    model: command.model ?? null,
    provider: command.provider ?? null,
    latency_ms: command.latency_ms ?? null,
    input_tokens: command.input_tokens ?? null,
    output_tokens: command.output_tokens ?? null,
    cost_usd: command.cost_usd ?? null,
    payload: command.payload ?? null,
    user_id: command.user_id ?? null,
  });

  // Guard clause: obsługa błędu na początku (early return pattern)
  // UWAGA: NIE logujemy tego błędu do ai_logs (circular dependency!)
  if (error) throw error;
}

/**
 * Pobiera listę logów AI z bazy danych z filtrami i paginacją.
 *
 * Endpoint służy do diagnostyki i analizy kosztów AI przez admina/service.
 * Dostępny TYLKO dla service-role key.
 *
 * Analogia do iOS: Podobne do fetchowania paginowanych danych z Firebase
 * lub własnego backend API. Różnica: PostgreSQL oferuje natywne wsparcie
 * dla count (total) i range (offset/limit).
 *
 * @param supabase - Klient Supabase (z context.locals w Astro API route)
 * @param filters - Opcjonalne filtry: event, level, created_after, created_before
 * @param pagination - Parametry paginacji: page (≥1), per_page (1-100)
 * @returns Promise z obiektem { logs: AiLogDto[], total: number }
 * @throws Rzuca błąd Supabase jeśli query się nie powiedzie
 *
 * @example
 * ```typescript
 * // W endpoint API:
 * const { logs, total } = await listAiLogs(
 *   context.locals.supabase,
 *   { event: "suggestion.generate", level: "info" },
 *   { page: 1, per_page: 20 }
 * );
 * // logs: AiLogDto[] - tablica logów
 * // total: number - całkowita liczba logów (dla pagination metadata)
 * ```
 */
export async function listAiLogs(
  supabase: SupabaseClient<Database>,
  filters: {
    event?: string;
    level?: string;
    created_after?: string;
    created_before?: string;
  },
  pagination: { page: number; per_page: number }
): Promise<{ logs: AiLogDto[]; total: number }> {
  // Budujemy base query
  // .select("*", { count: "exact" }) - pobiera wszystkie kolumny + total count
  // .order("created_at", { ascending: false }) - sortowanie od najnowszych (DESC)
  // Sortowanie DESC jest optymalne dla indeksu idx_ai_logs_event_created
  let query = supabase.from("ai_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });

  // Aplikuj filtry (conditional query building)
  // Podobne do .where() w Firebase queries lub Swift Predicate
  if (filters.event) {
    query = query.eq("event", filters.event);
  }
  if (filters.level) {
    query = query.eq("level", filters.level);
  }
  if (filters.created_after) {
    query = query.gte("created_at", filters.created_after);
  }
  if (filters.created_before) {
    query = query.lte("created_at", filters.created_before);
  }

  // Aplikuj paginację
  // offset = (page - 1) * per_page
  // range(offset, offset + per_page - 1) - np. dla page=2, per_page=20: range(20, 39)
  const offset = (pagination.page - 1) * pagination.per_page;
  query = query.range(offset, offset + pagination.per_page - 1);

  // Wykonaj query
  // { data, error, count } - data to tablica wierszy, count to total liczba (dla pagination)
  const { data, error, count } = await query;

  // Guard clause: obsługa błędu na początku
  if (error) throw error;

  // Zwróć dane jako { logs, total }
  // Type cast jest bezpieczny, bo select("*") zwraca wszystkie kolumny tabeli
  return {
    logs: (data ?? []) as AiLogDto[],
    total: count ?? 0,
  };
}
