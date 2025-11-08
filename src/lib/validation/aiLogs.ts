import { z } from "zod";

/**
 * Schema walidacji dla POST /api/v1/internal/ai/logs (ingest AI log)
 *
 * Endpoint służy do logowania interakcji z AI (OpenRouter) w celach diagnostycznych
 * i monitorowania kosztów. Dostępny TYLKO dla service-role key.
 *
 * @property event - Typ zdarzenia AI (np. "suggestion.generate") - WYMAGANE
 * @property level - Poziom loga: "info" | "warn" | "error" - WYMAGANE
 * @property model - Nazwa modelu AI (np. "gpt-4o-mini") - opcjonalne
 * @property provider - Provider AI (np. "openrouter") - opcjonalne
 * @property latency_ms - Czas odpowiedzi w ms (≥0) - opcjonalne
 * @property input_tokens - Liczba tokenów wejściowych (≥0) - opcjonalne
 * @property output_tokens - Liczba tokenów wyjściowych (≥0) - opcjonalne
 * @property cost_usd - Koszt wywołania w USD (≥0) - opcjonalne
 * @property payload - Dodatkowy kontekst JSON - opcjonalne
 * @property user_id - ID użytkownika powiązanego z logiem - opcjonalne
 *
 * @example
 * ```json
 * {
 *   "event": "suggestion.generate",
 *   "level": "info",
 *   "model": "gpt-4o-mini",
 *   "provider": "openrouter",
 *   "latency_ms": 450,
 *   "input_tokens": 1200,
 *   "output_tokens": 300,
 *   "cost_usd": 0.015,
 *   "payload": { "user_id": "uuid", "suggestion_id": "uuid" }
 * }
 * ```
 */
export const aiLogIngestSchema = z.object({
  event: z.string().min(1, "Event is required and cannot be empty"),
  level: z.string().min(1, "Level is required and cannot be empty"),
  model: z.string().optional(),
  provider: z.string().optional(),
  latency_ms: z.number().int().nonnegative("Latency must be non-negative integer").optional(),
  input_tokens: z.number().int().nonnegative("Input tokens must be non-negative integer").optional(),
  output_tokens: z.number().int().nonnegative("Output tokens must be non-negative integer").optional(),
  cost_usd: z.number().nonnegative("Cost must be non-negative number").optional(),
  payload: z.record(z.unknown()).optional(),
  user_id: z.string().uuid("User ID must be valid UUID").optional(),
});

/**
 * Schema walidacji dla GET /api/v1/internal/ai/logs (list AI logs)
 *
 * Endpoint służy do przeglądania logów AI z filtrami i paginacją.
 * Dostępny TYLKO dla service-role key.
 *
 * @property event - Filtr po typie zdarzenia - opcjonalne
 * @property level - Filtr po poziomie loga - opcjonalne
 * @property created_after - Logi utworzone po tej dacie (ISO timestamp) - opcjonalne
 * @property created_before - Logi utworzone przed tą datą (ISO timestamp) - opcjonalne
 * @property page - Numer strony (≥1, default: 1) - opcjonalne
 * @property per_page - Liczba elementów na stronę (1-100, default: 20) - opcjonalne
 *
 * @example
 * ```
 * ?event=suggestion.generate&level=info&page=1&per_page=20
 * ```
 */
export const aiLogListQuerySchema = z.object({
  event: z.string().optional(),
  level: z.string().optional(),
  created_after: z.string().datetime("Created after must be valid ISO timestamp").optional(),
  created_before: z.string().datetime("Created before must be valid ISO timestamp").optional(),
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  per_page: z.coerce.number().int().min(1).max(100, "Per page must be between 1 and 100").default(20),
});

/**
 * TypeScript types inferred from Zod schemas
 *
 * Analogia do iOS: Podobne do Codable w Swift - typy automatycznie
 * generowane z schematów walidacji, zapewniające type safety.
 */
export type AiLogIngestInput = z.infer<typeof aiLogIngestSchema>;
export type AiLogListQuery = z.infer<typeof aiLogListQuerySchema>;
