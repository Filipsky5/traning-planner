## Plan bazy danych (MVP) — opis wysokopoziomowy

Ten dokument opisuje model danych MVP aplikacji AI Running Training Planner w formie opisowej (bez SQL). Celem jest ujednolicenie języka biznesowego i technicznego oraz zapewnienie spójności z PRD i decyzjami architektonicznymi.

### Założenia architektoniczne

- System identyfikacji użytkowników: `auth.users` (Supabase Auth). Własnej tabeli profilu nie ma w MVP.
- Wszystkie tabele domenowe mają `user_id uuid → auth.users(id) ON DELETE CASCADE`.
- Czas i doby w UTC. `planned_date` to data (UTC), znaczące chwile czasu jako `timestamptz` (`created_at`, `updated_at`, `completed_at`).
- Klucze główne: `uuid`, generowane po stronie DB. Włączona funkcjonalność do generowania UUID (pgcrypto).
- RLS włączone na tabelach użytkownika; polityki USING/WITH CHECK `user_id = auth.uid()`.
- Słownik `training_types` utrzymuje listę typów treningów; deaktywacja przez `is_active` zamiast usuwania.
- Enumeracje (stabilne wartości, zarządzane w DB):
  - `workout_status`: planned | completed | skipped | canceled
  - `workout_rating`: too_easy | just_right | too_hard
  - `workout_origin`: manual | ai | import
  - `ai_suggestion_status`: shown | accepted | rejected | expired
  - `ai_event_kind`: regenerate (MVP)
  - `goal_type`: distance_by_date (MVP)

---

## Encje domenowe

### 1) training_types (słownik)
- Przeznaczenie: kanoniczny słownik typów treningów używany przez plan (workouts) i generator (ai_suggestions).
- Kluczowe atrybuty: `code` (PK, tekstowy kod), `name` (czytelna nazwa), `is_active` (aktywność), `created_at` (UTC).
- Zasady: usunięcie typu jest zabronione (RESTRICT) — dla spójności historycznej; wycofanie przez `is_active=false`.
- Dane początkowe (seed): `easy`, `tempo`, `intervals`, `long_run`, `recovery`, `walk`.

### 2) workouts (plan i realizacja)
- Przeznaczenie: reprezentuje jednostkę treningową — plan i (opcjonalnie) metryki realizacji.
- Kluczowe atrybuty planu (zawsze wymagane):
  - `user_id`, `training_type_code` (→ `training_types.code`), `planned_date` (UTC), `position` (kolejność w danym dniu, ≥1, unikalna per `user_id+planned_date`),
  - `planned_distance_m` (100–100000), `planned_duration_s` (300–21600).
- Kluczowe atrybuty realizacji (wymagane wyłącznie dla `status=completed`):
  - `distance_m` (100–100000), `duration_s` (300–21600), `avg_hr_bpm` (0–240), `completed_at` (UTC).
- Inne atrybuty:
  - `status` (planned/completed/skipped/canceled), `rating` (too_easy/just_right/too_hard tylko dla completed),
  - `origin` (manual/ai/import), `ai_suggestion_id` (występuje wyłącznie gdy `origin='ai'`),
  - `steps_jsonb` (lista kroków: rozgrzewka, część główna, schłodzenie — weryfikowana schematem w API),
  - `avg_pace_s_per_km` (pochodna: `duration_s / (distance_m/1000)`, null jeśli braki danych).
- Reguły integralności (egzekwowane w DB):
  - Metryki realizacji są wymagane wyłącznie dla `status='completed'`; w pozostałych statusach muszą być puste.
  - `rating` dozwolony wyłącznie przy `status='completed'`.
  - Zależność `origin ↔ ai_suggestion_id`: `origin='ai'` wtedy i tylko wtedy, gdy `ai_suggestion_id` nie jest null.
  - Unikalność `user_id + planned_date + position` (pozwala na kilka sesji w tym samym dniu, ale z kolejnością).
- Kluczowe relacje:
  - `training_type_code` → `training_types(code)` (RESTRICT),
  - `(ai_suggestion_id, user_id)` → `ai_suggestions(id, user_id)` (zapewnia spójność właściciela),
  - `user_id` → `auth.users(id)` (CASCADE przy usunięciu użytkownika).

### 3) ai_suggestions (propozycje AI)
- Przeznaczenie: przechowuje propozycje treningów wygenerowane przez AI przed akceptacją.
- Kluczowe atrybuty: `user_id`, `training_type_code` (→ słownik), `steps_jsonb` (lista kroków), `status` (shown/accepted/rejected/expired),
  `accepted_workout_id` (1–1 z `workouts`), `created_at`, `updated_at`.
- Zasady:
  - Wygaśnięcie po 24h liczone w logice aplikacji względem `created_at` (bez dodatkowej kolumny w DB).
  - Akceptacja ustawia `status='accepted'` i wskazuje `accepted_workout_id`; spójność typu i daty weryfikowana w API.
  - Unikalne odwzorowanie 1–1 między zaakceptowaną sugestią a treningiem (po obu stronach).

### 4) ai_suggestion_events (telemetria re-generacji)
- Przeznaczenie: rejestruje akcje „regenerate” (MVP) na sugestiach AI, do egzekwowania limitów.
- Kluczowe atrybuty: `user_id`, `ai_suggestion_id`, `kind` (zawsze `regenerate` w MVP), `occurred_at`, `metadata` (opcjonalnie).

### 5) user_goals (cele użytkownika)
- Przeznaczenie: prosty cel dystansowy w horyzoncie czasowym.
- Kluczowe atrybuty: `goal_type` (MVP: `distance_by_date`), `target_distance_m` (>0), `due_date` (data), `notes` (opcjonalnie).
- Zasady: na MVP dokładnie jeden cel na użytkownika (unikalność po `user_id`).

### 6) ai_logs (logi serwisowe)
- Przeznaczenie: logowanie zdarzeń i metryk interakcji z AI do diagnozy i rozliczeń.
- Dostęp: tylko dla service-role; RLS typowo wyłączone, kontrola przez uprawnienia. Retencja 30 dni (job zewnętrzny).
- Przykładowe atrybuty: `event`, `level`, `model`, `provider`, `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`, `payload`.

---

## Relacje i kardynalność

- `training_types (1) → (N) workouts` — spójność historyczna (RESTRICT).
- `training_types (1) → (N) ai_suggestions` — słownik typów (RESTRICT).
- `auth.users (1) → (N) workouts` — własność danych użytkownika (CASCADE na usunięcie użytkownika).
- `auth.users (1) → (N) ai_suggestions` — jw.
- `auth.users (1) → (N) ai_suggestion_events` — jw.
- `auth.users (1) → (1) user_goals` — dokładnie jeden cel na MVP.
- `ai_suggestions (1) → (0..1) workouts` — akceptacja: `accepted_workout_id` ↔ `workouts.id` (1–1, spójność `user_id`).
- `workouts (0..1) → (1) ai_suggestions` — pochodzenie AI: `(ai_suggestion_id, user_id)` ↔ `(id, user_id)`.

---

## Indeksy (cele i uzasadnienie)

- `workouts (user_id, planned_date)` — szybkie pobieranie wpisów do widoku kalendarza (zakresy dni).
- `workouts (user_id, training_type_code, completed_at DESC)` — 3 ostatnie zakończone treningi danego typu.
- `workouts (user_id, completed_at DESC)` — 3 ostatnie zakończone treningi ogólnie.
- Unikalny częściowy indeks `workouts (ai_suggestion_id) WHERE ai_suggestion_id IS NOT NULL` — odwzorowanie 1–1 akceptacji.
- `ai_suggestions (user_id, status, created_at DESC)` — filtrowanie po statusie i czasie (wygasanie, lista propozycji).
- `ai_suggestion_events (user_id, ai_suggestion_id, occurred_at DESC)` — egzekwowanie limitów re-generacji i audyt.
- `ai_logs (event, created_at DESC)` — optymalizacja GET /api/v1/internal/ai/logs z filtrem po event i sortowaniem po dacie.
- `ai_logs (level, created_at DESC)` — optymalizacja GET /api/v1/internal/ai/logs z filtrem po level i sortowaniem po dacie.
- Częściowy indeks `ai_logs (user_id) WHERE user_id IS NOT NULL` — optymalizacja queries filtrujących po user_id (pomija null values).

---

## Widoki pomocnicze

- `vw_last3_completed_per_type` — dla każdego użytkownika i typu treningu zwraca maks. 3 ostatnie wiersze o `status='completed'` posortowane po `completed_at DESC`.
- `vw_last3_completed_overall` — dla każdego użytkownika zwraca maks. 3 ostatnie wiersze o `status='completed'` posortowane po `completed_at DESC`.

---

## Zasady bezpieczeństwa (RLS)

- RLS włączone dla: `workouts`, `ai_suggestions`, `ai_suggestion_events`, `user_goals`.
- Polityki: SELECT/INSERT/UPDATE/DELETE wyłącznie gdy `user_id = auth.uid()` (USING i WITH CHECK). Dzięki temu każdy użytkownik widzi tylko swoje dane.
- `ai_logs` — dostęp tylko dla service-role; dane techniczne, bez RLS.

---

## Walidacje i spójność (DB + API)

- Zakresy planu: `planned_distance_m` 100–100000, `planned_duration_s` 300–21600.
- Zakresy realizacji: `distance_m` 100–100000, `duration_s` 300–21600, `avg_hr_bpm` 0–240 (wymagane tylko dla `completed`).
- Zależności warunkowe w DB:
  - `status='completed'` ⇒ metryki realizacji i `completed_at` muszą być obecne; dla innych statusów — muszą być puste.
  - `rating` dozwolony wyłącznie przy `status='completed'`.
  - `origin='ai'` ⇔ `ai_suggestion_id` niepuste.
- `steps_jsonb` weryfikowane minimalnie w DB (musi być tablicą); pełna walidacja schematu po stronie API.
- `avg_pace_s_per_km` obliczane pochodnie (może być kolumną generowaną w DB; null przy brakach danych).

---

## Zadania harmonogramowane (pg_cron)

- Cel: automatyczne wygaszanie przeterminowanych sugestii AI w interwale co godzinę.
- Reguła wygaśnięcia: rekord `ai_suggestions` o `status='shown'` i `created_at <= now() - interval '24 hours'` zostaje oznaczony jako `status='expired'` oraz aktualizowany jest `updated_at` (UTC).
- Mechanizm:
  - Funkcja `public.app_expire_ai_suggestions()` (PL/pgSQL) wykonująca pojedynczy `update` (idempotentna: wielokrotne wywołanie nie zmienia stanu poza pierwszym razem).
  - Harmonogram poprzez rozszerzenie `pg_cron`: job `expire_ai_suggestions_hourly` uruchamiany co godzinę o pełnej godzinie (`0 * * * *`).
- Bezpieczeństwo:
  - Funkcja jest `security definer` i ustawia `search_path` na `public`, aby bezpiecznie ominąć RLS i działać w kontekście właściciela tabel.
  - Funkcja nie jest udostępniana żadnym rolom aplikacyjnym; wywołuje ją wyłącznie harmonogram `pg_cron`.
- Operacyjność:
  - Migracja tworzy lub wznawia harmonogram; poprzednie zadanie o tej samej nazwie jest zastępowane (unikamy duplikatów).
  - Alternatywa, gdy `pg_cron` nie jest dostępny: zaplanowana Edge Function w Supabase wywołująca endpoint serwerowy, który wywołuje tę samą logikę.

---

## Dane początkowe (seed)

- `training_types.code`: `easy`, `tempo`, `intervals`, `long_run`, `recovery`, `walk` (bez `warmup`/`cooldown`).

---

## Rozszerzalność (poza MVP)

- Tabela `profiles` (opcjonalnie) z dodatkowymi danymi użytkownika.
- Partycjonowanie `workouts` po `planned_date` dla dużych wolumenów.
- Więcej zdarzeń w `ai_suggestion_events` (np. `generate`, `accept`).
- Nowe typy celów w `user_goals` (np. liczba sesji, czas do celu, konsekwencja).
- Integracje/importy (np. GPX/FIT) z `origin='import'` oraz dedykowanym źródłem metryk.

---

## Diagram ER (Mermaid)

Poniższy diagram odzwierciedla kardynalność i główne relacje pomiędzy encjami.

```mermaid
erDiagram
  AUTH_USERS {
    uuid id PK
  }

  TRAINING_TYPES {
    text code PK
  }

  WORKOUTS {
    uuid id PK
    uuid user_id FK
    text training_type_code FK
    uuid ai_suggestion_id FK
  }

  AI_SUGGESTIONS {
    uuid id PK
    uuid user_id FK
    text training_type_code FK
    uuid accepted_workout_id FK
  }

  AI_SUGGESTION_EVENTS {
    uuid id PK
    uuid user_id FK
    uuid ai_suggestion_id FK
  }

  USER_GOALS {
    uuid id PK
    uuid user_id FK UNIQUE
  }

  AI_LOGS {
    uuid id PK
    uuid user_id FK
  }

  TRAINING_TYPES ||--o{ WORKOUTS            : "code ➜ training_type_code"
  TRAINING_TYPES ||--o{ AI_SUGGESTIONS      : ""

  AUTH_USERS     ||--o{ WORKOUTS            : "id ➜ user_id"
  AUTH_USERS     ||--o{ AI_SUGGESTIONS      : ""
  AUTH_USERS     ||--o{ AI_SUGGESTION_EVENTS: ""
  AUTH_USERS     ||--|| USER_GOALS          : "1 : 1 (MVP)"
  AUTH_USERS     ||--o{ AI_LOGS             : ""

  AI_SUGGESTIONS ||--|| WORKOUTS            : "accepted_workout_id ↔ id (1 : 1)"
  WORKOUTS       }o--|| AI_SUGGESTIONS      : "ai_suggestion_id ↔ id (0 : 1)"
  AI_SUGGESTIONS ||--o{ AI_SUGGESTION_EVENTS: "id ➜ ai_suggestion_id"
```


