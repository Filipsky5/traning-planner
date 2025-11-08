#!/bin/bash

# Test Suite dla User Goal endpoints
# Testowane endpointy:
# - GET /api/v1/user-goal (pobranie aktualnego celu lub null)
# - PUT /api/v1/user-goal (utworzenie lub aktualizacja celu - upsert)
# - DELETE /api/v1/user-goal (usunięcie celu)

# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Skrypt automatycznie zaloguje testowego użytkownika (test@example.com)
# 4. Upewnij się że tabela user_goals istnieje w bazie

# Zmienne
BASE_URL="http://localhost:3000"

# Automatyczne pobieranie tokena z auth-test-user.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🔐 Pobieranie tokena autoryzacyjnego..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh")

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Nie udało się uzyskać tokena autoryzacyjnego."
  exit 1
fi

echo "✅ Token uzyskany (user: test@example.com)"
echo ""

echo "=================================="
echo "Test Suite: User Goal"
echo "=================================="
echo ""

# Zmienne do liczenia wyników
PASSED=0
FAILED=0
TOTAL=10

# ==================== AUTH & GET (no goal) ====================

# Test 1: GET /user-goal bez auth → 401 Unauthorized
echo "🔒 Test 1: GET /user-goal bez auth"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "401" ]; then
  echo "✅ Status: $STATUS (Unauthorized)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 401)"
  ((FAILED++))
fi
echo -e "\n"

# Test 2: GET /user-goal z auth (brak celu) → 200 OK, data: null
echo "📋 Test 2: GET /user-goal (brak celu)"
echo "Oczekiwany status: 200 OK, data: null"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 200)"
  ((FAILED++))
fi
echo -e "\n"

# ==================== PUT - CREATE ====================

# Test 3: PUT /user-goal - utworzenie celu → 200 OK
echo "✅ Test 3: PUT /user-goal (create)"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: goal object w response"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025-12-31",
    "notes": "Berlin Half Marathon"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 200)"
  ((FAILED++))
fi
echo -e "\n"

# Test 4: GET /user-goal z auth (cel istnieje) → 200 OK, goal object
echo "📋 Test 4: GET /user-goal (cel istnieje)"
echo "Oczekiwany status: 200 OK, data: goal object"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 200)"
  ((FAILED++))
fi
echo -e "\n"

# ==================== PUT - UPDATE ====================

# Test 5: PUT /user-goal - aktualizacja celu → 200 OK
echo "✅ Test 5: PUT /user-goal (update)"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: updated goal object"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 150000,
    "due_date": "2026-06-30",
    "notes": "Updated goal - Warsaw Marathon"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 200)"
  ((FAILED++))
fi
echo -e "\n"

# ==================== PUT - VALIDATION ERRORS ====================

# Test 6: PUT /user-goal - invalid date format → 422 Validation Error
echo "❌ Test 6: PUT /user-goal (invalid due_date format)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (date format must be YYYY-MM-DD)"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025/12/31"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "422" ]; then
  echo "✅ Status: $STATUS (Validation Error)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 422)"
  ((FAILED++))
fi
echo -e "\n"

# Test 7: PUT /user-goal - due_date w przeszłości → 422 Validation Error
echo "❌ Test 7: PUT /user-goal (due_date in past)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (due_date must be today or in the future)"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2020-01-01"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "422" ]; then
  echo "✅ Status: $STATUS (Validation Error)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 422)"
  ((FAILED++))
fi
echo -e "\n"

# ==================== DELETE ====================

# Test 8: DELETE /user-goal - usunięcie celu → 204 No Content
echo "🗑️  Test 8: DELETE /user-goal"
echo "Oczekiwany status: 204 No Content"
echo "Oczekiwane: pusty response body"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X DELETE \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "204" ]; then
  echo "✅ Status: $STATUS (No Content)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 204)"
  ((FAILED++))
fi
echo -e "\n"

# Test 9: GET /user-goal z auth (po usunięciu) → 200 OK, data: null
echo "📋 Test 9: GET /user-goal (po usunięciu)"
echo "Oczekiwany status: 200 OK, data: null"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 200)"
  ((FAILED++))
fi
echo -e "\n"

# Test 10: DELETE /user-goal - usunięcie nieistniejącego celu → 404 Not Found
echo "❌ Test 10: DELETE /user-goal (not found)"
echo "Oczekiwany status: 404 Not Found"
echo "Oczekiwane: error response z kodem 'not_found'"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X DELETE \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
if [ "$STATUS" = "404" ]; then
  echo "✅ Status: $STATUS (Not Found)"
  ((PASSED++))
else
  echo "❌ Status: $STATUS (Expected: 404)"
  ((FAILED++))
fi
echo -e "\n"

echo "=================================="
echo "Test Suite zakończony"
echo "=================================="
echo ""
echo "📊 Podsumowanie:"
echo "   Testy wykonane: $TOTAL"
echo "   Zaliczone: $PASSED ✅"
echo "   Niezaliczone: $FAILED ❌"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 Wszystkie testy przeszły pomyślnie!"
else
  echo "⚠️  $FAILED test(ów) nie przeszło. Sprawdź szczegóły powyżej."
fi

echo ""
echo "Wskazówki:"
echo "- Jeśli testy zwracają 500, sprawdź czy tabela user_goals istnieje w bazie"
echo "- Jeśli Test 2 zwraca goal zamiast null, uruchom najpierw Test 8/10 aby wyczyścić dane"
echo "- Sprawdź logi dev servera (npm run dev) dla szczegółów błędów"
