#!/bin/bash

# Test Suite dla GET /api/v1/workouts (lista z filtrami)
# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Zaloguj się i uzyskaj session token
# 4. Ustaw AUTH_TOKEN poniżej (Bearer token z Supabase session)

# Zmienne
BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/workouts"

# UWAGA: Musisz uzyskać ten token poprzez logowanie do Supabase
# Przykład: zaloguj się w UI, sprawdź Local Storage → sb-<project>-auth-token → access_token
# Lub użyj Supabase CLI: supabase auth login
AUTH_TOKEN="YOUR_SESSION_TOKEN_HERE"

echo "=================================="
echo "Test Suite: GET /api/v1/workouts (lista)"
echo "=================================="
echo ""

# Test 1: GET bez parametrów → 401 Unauthorized (brak auth)
echo "🔒 Test 1: GET bez auth token"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 2: GET bez parametrów z auth → 200 OK (wszystkie treningi użytkownika)
echo "📋 Test 2: GET bez parametrów (z auth)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: lista wszystkich treningów użytkownika + paginacja (page=1, per_page=20)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 3: GET z filtrem status=planned → 200 OK
echo "📋 Test 3: GET z filtrem status=planned"
echo "Oczekiwany status: 200"
echo "Oczekiwane: tylko treningi planned, sortowanie: planned_date:asc,position:asc"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?status=planned" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 4: GET z filtrem status=completed → 200 OK
echo "📋 Test 4: GET z filtrem status=completed"
echo "Oczekiwany status: 200"
echo "Oczekiwane: tylko treningi completed, sortowanie: completed_at:desc (najnowsze pierwsze)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?status=completed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 5: GET z filtrem training_type_code (multi-value)
echo "📋 Test 5: GET z filtrem training_type_code=easy,tempo"
echo "Oczekiwany status: 200"
echo "Oczekiwane: tylko treningi typu easy lub tempo"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?training_type_code=easy,tempo" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 6: GET z date range filters
echo "📋 Test 6: GET z filtrem planned_date_gte i planned_date_lte"
echo "Oczekiwany status: 200"
echo "Oczekiwane: tylko treningi w zakresie dat 2025-10-01 do 2025-10-31"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?planned_date_gte=2025-10-01&planned_date_lte=2025-10-31" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 7: GET z paginacją (page=2, per_page=10)
echo "📋 Test 7: GET z paginacją (page=2, per_page=10)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: druga strona wyników, 10 elementów per page"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?page=2&per_page=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 8: GET z custom sorting
echo "📋 Test 8: GET z custom sorting (training_type_code:asc)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: lista posortowana alfabetycznie po training_type_code"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?sort=training_type_code:asc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 9: GET z invalid page (page=0) → 422 Validation Error
echo "❌ Test 9: GET z invalid page (page=0)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (page must be >= 1)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?page=0" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 10: GET z invalid per_page (per_page=200) → 422 Validation Error
echo "❌ Test 10: GET z invalid per_page (per_page=200, max=100)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (per_page must be <= 100)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?per_page=200" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 11: GET z kombinacją filtrów
echo "📋 Test 11: GET z kombinacją filtrów (status=completed, rating=just_right, training_type_code=easy)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: tylko completed easy treningi z rating=just_right"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?status=completed&rating=just_right&training_type_code=easy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

echo "=================================="
echo "✅ Test Suite zakończony"
echo "=================================="
