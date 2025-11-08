#!/bin/bash

# Test Suite dla AI Logs (Internal-only endpoints)
# Testowane endpointy:
# - POST /api/v1/internal/ai/logs (ingest AI log)
# - GET /api/v1/internal/ai/logs (list AI logs with filters)

# WAŻNE: Te endpointy są INTERNAL-ONLY i wymagają service-role key.
# NIE wolno używać user JWT tokens! Service-role key ma pełny dostęp do bazy (omija RLS).

# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Upewnij się że .env zawiera SUPABASE_SERVICE_ROLE_KEY

# Zmienne
BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/internal/ai/logs"

# Wczytaj service-role key z .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Plik .env nie istnieje: $ENV_FILE"
  echo "   Skopiuj .env.example do .env i uzupełnij wartości"
  exit 1
fi

# Odczytaj SUPABASE_SERVICE_ROLE_KEY z .env
SERVICE_ROLE_KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [[ -z "$SERVICE_ROLE_KEY" ]] || [[ "$SERVICE_ROLE_KEY" == "###" ]]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY nie znaleziony lub nie ustawiony w .env"
  echo "   Dodaj do .env:"
  echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
  echo "   (dla Supabase local - standardowy demo key)"
  exit 1
fi

echo "✅ Service-role key załadowany z .env (${#SERVICE_ROLE_KEY} znaków)"
echo ""

# Opcjonalnie: pobierz user token dla testów negatywnych (403 Forbidden)
echo "🔐 Pobieranie user token dla testów negatywnych (403)..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh" 2>/dev/null)

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "⚠️  Nie udało się uzyskać user token - niektóre testy 403 zostaną pominięte"
  HAS_USER_TOKEN=false
else
  echo "✅ User token uzyskany (test@example.com)"
  HAS_USER_TOKEN=true
fi
echo ""

echo "=================================="
echo "Test Suite: AI Logs (Internal)"
echo "=================================="
echo ""

# ==================== POST TESTS ====================

# Test 1: POST success → 202 Accepted
echo "📝 Test 1: POST ingest AI log (success - pełne dane bez user_id)"
echo "Oczekiwany status: 202 Accepted"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "event": "suggestion.generate",
    "level": "info",
    "model": "gpt-4o-mini",
    "provider": "openrouter",
    "latency_ms": 450,
    "input_tokens": 1200,
    "output_tokens": 300,
    "cost_usd": 0.015,
    "payload": {
      "suggestion_id": "test-suggestion-123",
      "context": "test run"
    }
  }'
echo -e "\n\n"

# Test 2: POST minimal required fields → 202 Accepted
echo "📝 Test 2: POST z minimalnymi wymaganymi polami (event, level)"
echo "Oczekiwany status: 202 Accepted"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "event": "suggestion.regenerate",
    "level": "warn"
  }'
echo -e "\n\n"

# Test 3: POST error log → 202 Accepted
echo "📝 Test 3: POST error log"
echo "Oczekiwany status: 202 Accepted"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "event": "suggestion.generate",
    "level": "error",
    "provider": "openrouter",
    "payload": {
      "error": "OpenRouter API timeout",
      "error_code": "ETIMEDOUT"
    }
  }'
echo -e "\n\n"

# Test 4: POST bez Authorization header → 401 Unauthorized
echo "🔒 Test 4: POST bez Authorization header"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test.event",
    "level": "info"
  }'
echo -e "\n\n"

# Test 5: POST z user token zamiast service-role → 403 Forbidden
if [[ "$HAS_USER_TOKEN" == true ]]; then
  echo "🔒 Test 5: POST z user token zamiast service-role key"
  echo "Oczekiwany status: 403 Forbidden"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "event": "test.event",
      "level": "info"
    }'
  echo -e "\n\n"
else
  echo "⏭️  Test 5: Pominięto (brak user token)"
  echo -e "\n"
fi

# Test 6: POST z invalid service-role key → 403 Forbidden
echo "🔒 Test 6: POST z niepoprawnym service-role key"
echo "Oczekiwany status: 403 Forbidden"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-key-12345" \
  -d '{
    "event": "test.event",
    "level": "info"
  }'
echo -e "\n\n"

# Test 7: POST validation error (brak wymaganych pól) → 422 Unprocessable Entity
echo "❌ Test 7: POST validation error (brak event)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "level": "info"
  }'
echo -e "\n\n"

# Test 8: POST validation error (negative latency_ms) → 422 Unprocessable Entity
echo "❌ Test 8: POST validation error (latency_ms < 0)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "event": "test.event",
    "level": "info",
    "latency_ms": -100
  }'
echo -e "\n\n"

# Test 9: POST validation error (invalid user_id UUID) → 422 Unprocessable Entity
echo "❌ Test 9: POST validation error (invalid UUID)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{
    "event": "test.event",
    "level": "info",
    "user_id": "not-a-valid-uuid"
  }'
echo -e "\n\n"

# Test 10: POST invalid JSON → 400 Bad Request
echo "❌ Test 10: POST invalid JSON"
echo "Oczekiwany status: 400 Bad Request"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -d '{invalid json here'
echo -e "\n\n"

# ==================== GET TESTS ====================

# Test 11: GET all logs (default pagination) → 200 OK
echo "📖 Test 11: GET all logs (default pagination: page=1, per_page=20)"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 12: GET z filtrem po event → 200 OK
echo "📖 Test 12: GET z filtrem po event=suggestion.generate"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?event=suggestion.generate" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 13: GET z filtrem po level → 200 OK
echo "📖 Test 13: GET z filtrem po level=error"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?level=error" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 14: GET z filtrem po date range → 200 OK
echo "📖 Test 14: GET z filtrem po date range (created_after)"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?created_after=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 15: GET z kombinacją filtrów → 200 OK
echo "📖 Test 15: GET z kombinacją filtrów (event + level + pagination)"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?event=suggestion.generate&level=info&page=1&per_page=10" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 16: GET z custom pagination → 200 OK
echo "📖 Test 16: GET z custom pagination (page=2, per_page=5)"
echo "Oczekiwany status: 200 OK"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?page=2&per_page=5" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 17: GET bez Authorization header → 401 Unauthorized
echo "🔒 Test 17: GET bez Authorization header"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}"
echo -e "\n\n"

# Test 18: GET z user token zamiast service-role → 403 Forbidden
if [[ "$HAS_USER_TOKEN" == true ]]; then
  echo "🔒 Test 18: GET z user token zamiast service-role key"
  echo "Oczekiwany status: 403 Forbidden"
  echo "---"
  curl -v \
    -X GET \
    "${BASE_URL}${ENDPOINT}" \
    -H "Authorization: Bearer ${AUTH_TOKEN}"
  echo -e "\n\n"
else
  echo "⏭️  Test 18: Pominięto (brak user token)"
  echo -e "\n"
fi

# Test 19: GET validation error (invalid created_after timestamp) → 422 Unprocessable Entity
echo "❌ Test 19: GET validation error (invalid created_after timestamp)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?created_after=not-a-timestamp" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 20: GET validation error (page < 1) → 422 Unprocessable Entity
echo "❌ Test 20: GET validation error (page < 1)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?page=0" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

# Test 21: GET validation error (per_page > 100) → 422 Unprocessable Entity
echo "❌ Test 21: GET validation error (per_page > 100)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?per_page=150" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"
echo -e "\n\n"

echo "=================================="
echo "✅ Test Suite zakończony"
echo "=================================="
echo ""
echo "Uwagi:"
echo "- Wszystkie testy POST powinny zwrócić 202 Accepted (success) lub odpowiedni error code"
echo "- Wszystkie testy GET powinny zwrócić 200 OK z pagination metadata lub odpowiedni error code"
echo "- Endpoint jest INTERNAL-ONLY - wymaga service-role key"
echo "- User tokens są odrzucane z 403 Forbidden"
echo ""
