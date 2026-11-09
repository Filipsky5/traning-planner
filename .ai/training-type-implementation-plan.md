## API Implementation Plan: GET /api/v1/training-types

### 1. Endpoint Overview

- **Goal**: Return workout types. Active only by default (`is_active=true`). Service/admin requests may return all (`include_inactive=true`).
- **Cache**: ETag support + `Cache-Control: private, max-age=3600, stale-while-revalidate=86400`.
- **Idempotency/no changes**: If the client provides `If-None-Match` matching the current ETag, return `304 Not Modified` without a body.

### 2. Request Details

- **Method**: GET
- **URL**: `/api/v1/training-types`
- **Query parameters**:
  - `include_inactive` (boolean, optional, default `false`): requires service/admin privileges.
- **Request headers**:
  - `If-None-Match` (optional): ETag from a previous response for cache validation.
  - `X-Internal-Token` (optional, service): internal token enabling `include_inactive=true` in MVP (without admin profiles).
- **Body**: none

### 3. Types Used

- From `src/types.ts`:
  - `TrainingTypeDto = { code: string; name: string; is_active: boolean; created_at: string }`
  - `ApiListResponse<TrainingTypeDto>`: `{ data: TrainingTypeDto[]; page: number; per_page: number; total: number }`

### 4. Response Details

- **200 OK**:
  - Body (JSON): `ApiListResponse<TrainingTypeDto>`
  - Headers: `ETag`, `Cache-Control: private, max-age=3600, stale-while-revalidate=86400`
- **304 Not Modified**: no body; returns `ETag` and `Cache-Control` (recommended)
- **401 Unauthorized**: request uses `include_inactive=true` without valid credentials (e.g., missing/invalid internal token)
- **403 Forbidden**: authenticated client lacks permission for `include_inactive=true`
- **500 Internal Server Error**: server/DB error

Example 200:

```json
{
  "data": [{ "code": "easy", "name": "Easy Run", "is_active": true, "created_at": "2025-10-11T00:00:00Z" }],
  "page": 1,
  "per_page": 20,
  "total": 6
}
```

### 5. Data Flow

1. Client calls `GET /api/v1/training-types` with optional `?include_inactive=true` and/or `If-None-Match`.
2. Endpoint (Astro API Route) parses and validates query with Zod.
3. If `include_inactive=true`, endpoint checks privileges:
   - MVP: compare `X-Internal-Token` against `import.meta.env.INTERNAL_ADMIN_TOKEN`.
   - Optional extension: if user admins are introduced, check role/allowlist (e.g., `ADMIN_EMAILS`) before returning 403.
4. `trainingTypesService.list` fetches `public.training_types` through `context.locals.supabase` (columns: `code,name,is_active,created_at`), sorted by `code` for deterministic order.
5. Endpoint builds a stable payload (DTO array) and calculates ETag from a canonical representation (e.g., JSON.stringify of sorted DTOs) using SHA-256.
6. If `If-None-Match` equals the calculated `ETag`, return `304 Not Modified`.
7. Otherwise return `200 OK` with body, `ETag`, and `Cache-Control`.

### 6. Security Considerations

- **Parameter authorization**: `include_inactive=true` requires an internal token (`X-Internal-Token` = `INTERNAL_ADMIN_TOKEN`) in MVP, avoiding reliance on nonexistent admin profiles.
- **No excessive privileges**: Use `context.locals.supabase` (anon client) only to SELECT the dictionary; it contains no user data.
- **Cache headers**: `private` prevents CDN sharing across users.
- **Input validation**: Zod + defensive boolean parser, reject unknown parameters.
- **Headers**: Sanitize read headers (fixed supported list), do not echo unverified values.
- **Secrets**: Keep `INTERNAL_ADMIN_TOKEN` in env; never send to client; validate server-side.

### 7. Error Handling

- 400 Bad Request: invalid query format (e.g., unparseable boolean) — message with validation errors.
- 401 Unauthorized: `include_inactive=true` without valid credentials (missing/invalid `X-Internal-Token`).
- 403 Forbidden: `include_inactive=true` with credentials but no privileges (future scenario with user roles).
- 500 Internal Server Error: DB query errors/unexpected exceptions.

Error format (consistent, minimal):

```json
{ "error": { "code": "<string>", "message": "<string>" } }
```

Logging:

- Validation errors: `warn` with `requestId` (if available), parameters, and 400.
- Authorization errors: `info`/`warn` with 401/403 (no sensitive data).
- Server/DB errors: `error` with context (no personal data). No persistence in `ai_logs` (AI-specific), only the standard server logger.

### 8. Performance Considerations

- Small dictionary — one `select` of fixed columns; indexing is not critical.
- Deterministic sorting (`order by code`) ensures stable ETag.
- ETag + `stale-while-revalidate` significantly reduce load.
- Minimal payload: only columns required by `TrainingTypeDto`.

### 9. Implementation Steps

1. File structure
   - Endpoint: `src/pages/api/v1/training-types.ts`
   - Service: `src/lib/services/trainingTypesService.ts`
   - Validation: `src/lib/validation/trainingTypes.ts`
   - Util ETag: `src/lib/http/etag.ts`
   - Optional response/error utility: `src/lib/http/responses.ts`

2. Zod – query validation

```ts
// src/lib/validation/trainingTypes.ts
import { z } from "zod";

export const listQuerySchema = z.object({
  include_inactive: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => (typeof v === "string" ? v.toLowerCase() : v))
    .transform((v) => (v === "true" || v === true ? true : false)),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
```

3. Service – fetch data from Supabase

```ts
// src/lib/services/trainingTypesService.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { TrainingTypeDto } from "../../types";

export async function listTrainingTypes(
  supabase: SupabaseClient<Database>,
  includeInactive: boolean
): Promise<TrainingTypeDto[]> {
  const base = supabase
    .from("training_types")
    .select("code,name,is_active,created_at")
    .order("code", { ascending: true });

  const query = includeInactive ? base : base.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TrainingTypeDto[];
}
```

4. Util – ETag

```ts
// src/lib/http/etag.ts
import { createHash } from "node:crypto";

export function computeEtag(value: unknown): string {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  const hash = createHash("sha256").update(json).digest("hex");
  return `"${hash}"`; // strong ETag
}
```

5. Endpoint – Astro API Route

```ts
// src/pages/api/v1/training-types.ts
export const prerender = false;

import type { APIContext } from "astro";
import { listQuerySchema } from "../../../lib/validation/trainingTypes";
import { listTrainingTypes } from "../../../lib/services/trainingTypesService";
import { computeEtag } from "../../../lib/http/etag";
import type { ApiListResponse, TrainingTypeDto } from "../../../types";

export async function GET(context: APIContext) {
  try {
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const { include_inactive = false } = listQuerySchema.parse(params);

    // Parameter authorization (MVP: internal token)
    if (include_inactive) {
      const token = context.request.headers.get("x-internal-token");
      const allowed = token && token === import.meta.env.INTERNAL_ADMIN_TOKEN;
      if (!token) {
        return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Missing credentials" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      if (!allowed) {
        return new Response(JSON.stringify({ error: { code: "forbidden", message: "Insufficient privileges" } }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }

    const items: TrainingTypeDto[] = await listTrainingTypes(context.locals.supabase, include_inactive);

    // Fixed pagination (small dictionary) – according to ApiListResponse
    const page = 1;
    const per_page = 20;
    const total = items.length;
    const payload: ApiListResponse<TrainingTypeDto> = { data: items, page, per_page, total };

    // ETag + 304
    const etag = computeEtag(items); // only list data affects ETag
    const ifNoneMatch = context.request.headers.get("if-none-match");
    const cacheHeaders = {
      ETag: etag,
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "content-type": "application/json",
    } as const;

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: cacheHeaders });
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: cacheHeaders });
  } catch (err: any) {
    console.error("GET /api/v1/training-types failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

6. Environment configuration

- Add `INTERNAL_ADMIN_TOKEN` to `.env.local` (and deployment environments) – secret MVP service token.
- Keep existing `SUPABASE_URL`, `SUPABASE_KEY` (anon) as configured.

7. Tests (high level)

- 200 (active dictionary): no token/query ⇒ active list.
- 200 (include_inactive): valid `X-Internal-Token` and `?include_inactive=true` ⇒ full list.
- 401: `?include_inactive=true` without token.
- 403: `?include_inactive=true` with invalid token.
- 304: second request with `If-None-Match`=ETag from previous 200.
- 500: simulate DB error (e.g., temporarily force service error) ⇒ error structure.

8. DB and RLS notes

- `training_types` is a global dictionary; no per-user data. Anon client SELECT is sufficient.
- Historical consistency: RESTRICT deletion (handled by migrations). Deactivate using `is_active=false`.
- Indexing is noncritical for a small table; `order by code` stabilizes ETag.

9. Operations and monitoring

- Add lightweight logging (request start/end, path, status, duration) for diagnostics.
- If needed, add reverse proxy/adapter rate limiting (beyond MVP).
