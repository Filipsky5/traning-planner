/**
 * GET /api/v1/training-types
 *
 * Endpoint zwracający listę typów treningów (słownik globalny).
 * Domyślnie zwraca tylko aktywne typy. Dla admina/serwisu możliwe zwrócenie wszystkich.
 *
 * Analogia do iOS: Podobne do endpoint'u REST API w aplikacji mobilnej.
 * SSR w Astro: Kod wykonuje się na serwerze (Node.js), nie w przeglądarce.
 *
 * Features:
 * - HTTP Cache z ETag i 304 Not Modified (oszczędność transferu danych)
 * - Autoryzacja przez token wewnętrzny (MVP: X-Internal-Token header)
 * - Walidacja parametrów przez Zod
 */
export const prerender = false;

import type { APIContext } from "astro";
import { listQuerySchema } from "../../../lib/validation/trainingTypes";
import { listTrainingTypes } from "../../../lib/services/trainingTypesService";
import { computeEtag } from "../../../lib/http/etag";
import type { ApiListResponse, TrainingTypeDto } from "../../../types";

/**
 * Handler GET dla endpoint'u.
 * Uppercase 'GET' zgodnie z konwencją Astro (podobnie jak HTTP metody w Express/Fastify).
 */
export async function GET(context: APIContext) {
  try {
    // 1. Parsowanie i walidacja query parameters
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Walidacja przez Zod - rzuci błąd jeśli format niepoprawny
    const { include_inactive = false } = listQuerySchema.parse(params);

    // 2. Autoryzacja parametru include_inactive (guard clause pattern)
    // MVP: Sprawdzenie tokenu wewnętrznego (w przyszłości: role użytkowników)
    if (include_inactive) {
      const token = context.request.headers.get("x-internal-token");

      // Guard clause: brak tokenu → 401 Unauthorized
      if (!token) {
        return new Response(
          JSON.stringify({
            error: { code: "unauthorized", message: "Missing credentials" },
          }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }

      // Guard clause: niepoprawny token → 403 Forbidden
      const allowed = token === import.meta.env.INTERNAL_ADMIN_TOKEN;
      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: { code: "forbidden", message: "Insufficient privileges" },
          }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    // 3. Pobranie danych z Supabase przez service layer
    // context.locals.supabase jest dostępny dzięki middleware Astro
    const items: TrainingTypeDto[] = await listTrainingTypes(context.locals.supabase, include_inactive);

    // 4. Przygotowanie odpowiedzi z paginacją (MVP: stała, bo słownik mały)
    const page = 1;
    const per_page = 20;
    const total = items.length;
    const payload: ApiListResponse<TrainingTypeDto> = {
      data: items,
      page,
      per_page,
      total,
    };

    // 5. Generowanie ETag i obsługa cache (304 Not Modified)
    // ETag = fingerprint danych (SHA-256 hash). Jeśli dane się nie zmieniły, klient
    // dostaje 304 bez ciała odpowiedzi → oszczędność transferu danych
    const etag = computeEtag(items); // hash tylko danych, nie metadanych paginacji
    const ifNoneMatch = context.request.headers.get("if-none-match");

    const cacheHeaders = {
      ETag: etag,
      // Cache-Control:
      // - private: nie cache'uj na CDN/shared cache (dane per-user w przyszłości)
      // - max-age=3600: cache ważny 1h
      // - stale-while-revalidate=86400: może użyć stale cache przez 24h podczas rewalidacji
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "content-type": "application/json",
    } as const;

    // Guard clause: ETag się zgadza → 304 Not Modified (bez ciała)
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: cacheHeaders });
    }

    // 6. Happy path: zwróć 200 OK z danymi i nagłówkami cache
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (err: any) {
    // Obsługa błędów walidacji Zod
    if (err.name === "ZodError") {
      console.warn("GET /api/v1/training-types - validation error", {
        errors: err.errors,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid query parameters",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // Błędy serwerowe/DB - loguj szczegóły (bez danych osobowych)
    console.error("GET /api/v1/training-types failed", { err });
    return new Response(
      JSON.stringify({
        error: { code: "internal_error", message: "Unexpected server error" },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
