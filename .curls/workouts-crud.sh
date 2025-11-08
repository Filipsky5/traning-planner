#!/bin/bash

# Test Suite dla CRUD operations + Domain Actions
# Testowane endpointy:
# - POST /api/v1/workouts (create)
# - GET /api/v1/workouts/{id} (detail)
# - PATCH /api/v1/workouts/{id} (update)
# - DELETE /api/v1/workouts/{id} (delete)
# - POST /api/v1/workouts/{id}/complete
# - POST /api/v1/workouts/{id}/skip
# - POST /api/v1/workouts/{id}/cancel
# - POST /api/v1/workouts/{id}/rate

# Przed uruchomieniem:
# 1. Upewnij się że Supabase local działa (supabase start)
# 2. Uruchom dev server: npm run dev
# 3. Zaloguj się i uzyskaj session token
# 4. Ustaw AUTH_TOKEN poniżej

# Zmienne
BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/workouts"
AUTH_TOKEN="YOUR_SESSION_TOKEN_HERE"

# Zmienna na przechowanie utworzonego workout ID
WORKOUT_ID=""

echo "=================================="
echo "Test Suite: Workouts CRUD + Domain Actions"
echo "=================================="
echo ""

# ==================== CREATE (POST) ====================

# Test 1: POST create planned workout → 201 Created
echo "📝 Test 1: POST create planned workout"
echo "Oczekiwany status: 201 Created"
echo "---"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-15",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [
      { "part": "warmup", "duration_s": 600 },
      { "part": "main", "duration_s": 900 },
      { "part": "cooldown", "duration_s": 300 }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
echo "Status: $HTTP_CODE"
echo "Body: $BODY"

# Extract workout ID dla kolejnych testów
WORKOUT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "📌 Zapisany WORKOUT_ID: $WORKOUT_ID"
echo -e "\n"

# Test 2: POST create completed workout → 201 Created
echo "📝 Test 2: POST create completed workout (z metrykami)"
echo "Oczekiwany status: 201 Created"
echo "Oczekiwane: status=completed, avg_pace_s_per_km obliczone automatycznie"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "tempo",
    "planned_date": "2025-11-16",
    "position": 1,
    "planned_distance_m": 8000,
    "planned_duration_s": 2400,
    "status": "completed",
    "distance_m": 8200,
    "duration_s": 2460,
    "avg_hr_bpm": 165,
    "completed_at": "2025-11-16T18:30:00Z",
    "rating": "just_right",
    "steps": [
      { "part": "warmup", "distance_m": 1000, "duration_s": 360 },
      { "part": "main", "distance_m": 6000, "duration_s": 1680 },
      { "part": "cooldown", "distance_m": 1200, "duration_s": 420 }
    ]
  }'
echo -e "\n\n"

# Test 3: POST bez auth → 401 Unauthorized
echo "🔒 Test 3: POST bez auth token"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-17",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }'
echo -e "\n\n"

# Test 4: POST z invalid training_type_code → 404 Not Found
echo "❌ Test 4: POST z nieistniejącym training_type_code"
echo "Oczekiwany status: 404 Not Found"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "nonexistent_type",
    "planned_date": "2025-11-18",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }'
echo -e "\n\n"

# Test 5: POST z duplicate position → 409 Conflict
echo "❌ Test 5: POST z duplikatem position (user_id, planned_date, position)"
echo "Oczekiwany status: 409 Conflict"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-15",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }'
echo -e "\n\n"

# Test 6: POST completed bez metryk → 422 Validation Error
echo "❌ Test 6: POST completed workout bez wymaganych metryk"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (completed wymaga distance_m, duration_s, avg_hr_bpm, completed_at)"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-19",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "status": "completed",
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }'
echo -e "\n\n"

# ==================== READ (GET by ID) ====================

# Test 7: GET workout by id → 200 OK
echo "📖 Test 7: GET workout by id"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: pełne szczegóły workout (z steps)"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 8: GET workout by id bez auth → 401 Unauthorized
echo "🔒 Test 8: GET workout by id bez auth"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}" \
  -H "Content-Type: application/json"
echo -e "\n\n"

# Test 9: GET nieistniejący workout → 404 Not Found
echo "❌ Test 9: GET nieistniejący workout"
echo "Oczekiwany status: 404 Not Found"
echo "---"
curl -v \
  -X GET \
  "${BASE_URL}${ENDPOINT}/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# ==================== UPDATE (PATCH) ====================

# Test 10: PATCH update workout → 200 OK
echo "✏️ Test 10: PATCH update workout (zmiana planned_distance_m)"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: zaktualizowane dane"
echo "---"
curl -v \
  -X PATCH \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "planned_distance_m": 6000,
    "planned_duration_s": 2100
  }'
echo -e "\n\n"

# Test 11: PATCH z próbą zmiany immutable field → 422 Validation Error
echo "❌ Test 11: PATCH z próbą zmiany immutable field (origin)"
echo "Oczekiwany status: 422 Unprocessable Entity"
echo "Oczekiwane: validation error (strict mode blokuje nieznane/immutable fields)"
echo "---"
curl -v \
  -X PATCH \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "origin": "ai"
  }'
echo -e "\n\n"

# ==================== DOMAIN ACTIONS ====================

# Test 12: POST /complete → 200 OK
echo "✅ Test 12: POST complete workout"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: status=completed, avg_pace obliczone"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "distance_m": 6100,
    "duration_s": 2130,
    "avg_hr_bpm": 142,
    "completed_at": "2025-11-15T19:00:00Z",
    "rating": "just_right"
  }'
echo -e "\n\n"

# Test 13: POST /complete ponownie → 409 Conflict (already completed)
echo "❌ Test 13: POST complete ponownie (already completed)"
echo "Oczekiwany status: 409 Conflict"
echo "Oczekiwane: invalid_status_transition error"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "distance_m": 6100,
    "duration_s": 2130,
    "avg_hr_bpm": 142,
    "completed_at": "2025-11-15T19:00:00Z"
  }'
echo -e "\n\n"

# Test 14: POST /rate → 200 OK
echo "⭐ Test 14: POST rate completed workout"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: rating zaktualizowany"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID}/rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "rating": "too_easy"
  }'
echo -e "\n\n"

# Utworzenie workout do skip/cancel (bo completed nie można skip/cancel)
echo "📝 Tworzenie nowego workout do testów skip/cancel..."
RESPONSE2=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-20",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }')

WORKOUT_ID_2=$(echo "$RESPONSE2" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "📌 WORKOUT_ID_2: $WORKOUT_ID_2"
echo -e "\n"

# Test 15: POST /skip → 200 OK
echo "⏭️ Test 15: POST skip workout"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: status=skipped, metrics cleared"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID_2}/skip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{}'
echo -e "\n\n"

# Utworzenie workout do cancel
echo "📝 Tworzenie nowego workout do testu cancel..."
RESPONSE3=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "training_type_code": "easy",
    "planned_date": "2025-11-21",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "steps": [{ "part": "main", "duration_s": 1800 }]
  }')

WORKOUT_ID_3=$(echo "$RESPONSE3" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "📌 WORKOUT_ID_3: $WORKOUT_ID_3"
echo -e "\n"

# Test 16: POST /cancel → 200 OK
echo "🚫 Test 16: POST cancel workout"
echo "Oczekiwany status: 200 OK"
echo "Oczekiwane: status=canceled, metrics cleared"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID_3}/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{}'
echo -e "\n\n"

# ==================== DELETE ====================

# Test 17: DELETE workout → 204 No Content
echo "🗑️ Test 17: DELETE workout"
echo "Oczekiwany status: 204 No Content"
echo "---"
curl -v \
  -X DELETE \
  "${BASE_URL}${ENDPOINT}/${WORKOUT_ID_3}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

# Test 18: DELETE nieistniejący workout → 404 Not Found
echo "❌ Test 18: DELETE nieistniejący workout"
echo "Oczekiwany status: 404 Not Found"
echo "---"
curl -v \
  -X DELETE \
  "${BASE_URL}${ENDPOINT}/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo -e "\n\n"

echo "=================================="
echo "✅ Test Suite zakończony"
echo "=================================="
echo ""
echo "Utworzone workouts (do ręcznego sprawdzenia/czyszczenia):"
echo "- WORKOUT_ID (completed): $WORKOUT_ID"
echo "- WORKOUT_ID_2 (skipped): $WORKOUT_ID_2"
echo "- WORKOUT_ID_3 (deleted): $WORKOUT_ID_3"
