#!/bin/bash

# Test Suite dla GET /api/v1/training-types
# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Upewnij się że masz dane w tabeli training_types

# Zmienne
BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/training-types"
ADMIN_TOKEN="dev-local-admin-token-change-in-production"

echo "=================================="
echo "Test Suite: GET /api/v1/training-types"
echo "=================================="
echo ""

# Test 1: GET bez parametrów → 200 OK (tylko aktywne typy treningów)
echo "📋 Test 1: GET bez parametrów (tylko aktywne typy)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: lista aktywnych typów treningów + nagłówki ETag i Cache-Control"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 2: GET z include_inactive=false (explicit) → 200 OK
echo "📋 Test 2: GET z include_inactive=false (explicit)"
echo "Oczekiwany status: 200"
echo "Oczekiwane: to samo co Test 1 (tylko aktywne)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?include_inactive=false" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 3: GET z include_inactive=true BEZ tokenu → 401 Unauthorized
echo "🔒 Test 3: GET z include_inactive=true BEZ tokenu"
echo "Oczekiwany status: 401 Unauthorized"
echo "Oczekiwane: { \"error\": { \"code\": \"unauthorized\", \"message\": \"Missing credentials\" } }"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?include_inactive=true" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 4: GET z include_inactive=true + BŁĘDNY token → 403 Forbidden
echo "🔒 Test 4: GET z include_inactive=true + BŁĘDNY token"
echo "Oczekiwany status: 403 Forbidden"
echo "Oczekiwane: { \"error\": { \"code\": \"forbidden\", \"message\": \"Insufficient privileges\" } }"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?include_inactive=true" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: wrong-token-123"
echo -e "\n\n"

# Test 5: GET z include_inactive=true + PRAWIDŁOWY token → 200 OK (wszystkie typy)
echo "✅ Test 5: GET z include_inactive=true + PRAWIDŁOWY token"
echo "Oczekiwany status: 200"
echo "Oczekiwane: lista WSZYSTKICH typów (aktywne + nieaktywne)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?include_inactive=true" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: ${ADMIN_TOKEN}"
echo -e "\n\n"

# Test 6: ETag - pierwsze zapytanie (zapisz ETag)
echo "💾 Test 6a: GET bez parametrów - zapisz ETag do zmiennej"
echo "Oczekiwany status: 200"
echo "---"
RESPONSE=$(curl -s -D - \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json")

echo "$RESPONSE"
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')
echo -e "\n📌 Zapisany ETag: $ETAG\n"

# Test 7: ETag - drugie zapytanie z If-None-Match → 304 Not Modified
echo "💾 Test 6b: GET z If-None-Match (użyj zapisanego ETag)"
echo "Oczekiwany status: 304 Not Modified"
echo "Oczekiwane: brak ciała odpowiedzi (puste body)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "If-None-Match: ${ETAG}"
echo -e "\n\n"

# Test 8: Walidacja - nieprawidłowy parametr (opcjonalny)
echo "❌ Test 7: GET z nieprawidłowym parametrem"
echo "Oczekiwany status: 200 (Zod transformuje wartości, więc 'abc' → false)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}?include_inactive=abc" \
  -H "Content-Type: application/json"
echo -e "\n\n"

echo "=================================="
echo "✅ Test Suite zakończony"
echo "=================================="
