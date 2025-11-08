#!/bin/bash

# Test Suite dla Special Endpoints
# Testowane endpointy:
# - GET /api/v1/workouts/last3 (ostatnie 3 ukończone treningi)
# - GET /api/v1/calendar (widok kalendarza)

# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Zaloguj się i uzyskaj session token
# 4. Ustaw AUTH_TOKEN poniżej
# 5. Upewnij się że masz kilka completed workouts w bazie

# Zmienne
BASE_URL="http://localhost:3000"
AUTH_TOKEN="YOUR_SESSION_TOKEN_HERE"

echo "=================================="
echo "Test Suite: Special Endpoints (last3, calendar)"
echo "=================================="
echo ""

# ==================== LAST3 ====================

# Test 1: GET /workouts/last3 bez parametrów → 200 OK
echo "📋 Test 1: GET /workouts/last3 bez parametrów"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: ostatnie 3 ukończone treningi (all types), page=1, per_page=3"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/workouts/last3" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 2: GET /workouts/last3 z filtrem training_type_code → 200 OK
echo "📋 Test 2: GET /workouts/last3?training_type_code=easy"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: ostatnie 3 ukończone treningi typu 'easy'"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/workouts/last3?training_type_code=easy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 3: GET /workouts/last3 z filtrem training_type_code=tempo → 200 OK
echo "📋 Test 3: GET /workouts/last3?training_type_code=tempo"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: ostatnie 3 ukończone treningi typu 'tempo'"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/workouts/last3?training_type_code=tempo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 4: GET /workouts/last3 bez auth → 401 Unauthorized
echo "🔒 Test 4: GET /workouts/last3 bez auth"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/workouts/last3" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# ==================== CALENDAR ====================

# Test 5: GET /calendar z date range → 200 OK
echo "📅 Test 5: GET /calendar?start=2025-11-01&end=2025-11-30"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: workouts zgrupowane po datach (days array)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-01&end=2025-11-30" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 6: GET /calendar z date range + status filter → 200 OK
echo "📅 Test 6: GET /calendar?start=2025-11-01&end=2025-11-30&status=planned"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: tylko planned workouts w danym zakresie dat"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-01&end=2025-11-30&status=planned" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 7: GET /calendar z date range + status=completed → 200 OK
echo "📅 Test 7: GET /calendar?start=2025-11-01&end=2025-11-30&status=completed"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: tylko completed workouts w danym zakresie dat"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-01&end=2025-11-30&status=completed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 8: GET /calendar bez parametrów → 422 Validation Error
echo "❌ Test 8: GET /calendar bez wymaganych parametrów (start, end)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (start i end wymagane)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 9: GET /calendar z invalid date format → 422 Validation Error
echo "❌ Test 9: GET /calendar z invalid date format"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (date format must be YYYY-MM-DD)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025/11/01&end=2025/11/30" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 10: GET /calendar z invalid date range (end < start) → 422 Validation Error
echo "❌ Test 10: GET /calendar z invalid date range (end < start)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (end must be >= start)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-30&end=2025-11-01" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 11: GET /calendar bez auth → 401 Unauthorized
echo "🔒 Test 11: GET /calendar bez auth"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-01&end=2025-11-30" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 12: GET /calendar z narrow date range (1 dzień) → 200 OK
echo "📅 Test 12: GET /calendar z narrow date range (1 dzień)"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: workouts tylko z tego dnia"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-11-15&end=2025-11-15" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 13: GET /calendar z wide date range (3 miesiące) → 200 OK
echo "📅 Test 13: GET /calendar z wide date range (3 miesiące)"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: wszystkie workouts z 3 miesięcy"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}/api/v1/calendar?start=2025-10-01&end=2025-12-31" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

echo "=================================="
echo "✅ Test Suite zakończony"
echo "=================================="
echo ""
echo "Wskazówki:"
echo "- Jeśli last3 zwraca puste wyniki, upewnij się że masz completed workouts w bazie"
echo "- Jeśli calendar zwraca puste days[], sprawdź czy masz workouts w podanym zakresie dat"
echo "- Możesz użyć workouts-crud.sh do utworzenia testowych danych"
