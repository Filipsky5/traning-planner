#!/bin/bash

# Test Suite: AI Suggestion Events Endpoint
# -----------------------------------------
# Zakres testów:
# - GET /api/v1/ai/suggestions/{id}/events (lista eventów z paginacją)
#
# Scenariusze:
# 1. GET bez parametrów (default pagination)
# 2. GET z custom pagination (page, per_page)
# 3. GET bez auth token (expect 401)
# 4. GET dla nieistniejącej sugestii (expect 404)
# 5. GET z invalid pagination params (expect 400)

set -euo pipefail

BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/ai/suggestions"

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

# Konfiguracja testu
TRAINING_TYPE_CODE="easy"
# Użyj daty jutrzejszej aby ominąć daily limit
PLANNED_DATE=$(date -u -v+1d +"%Y-%m-%d" 2>/dev/null || date -u -d "+1 day" +"%Y-%m-%d")

# Użyj istniejącego SUGGESTION_ID jeśli podano (unika daily limit)
# Użycie: SUGGESTION_ID=uuid ./ai-suggestions-events.sh
SUGGESTION_ID="${SUGGESTION_ID:-}"
PASSED=0
FAILED=0

pretty_print() {
  jq '.' <<<"$1"
}

separator() {
  echo ""
  echo "----------------------------------------"
  echo ""
}

echo "========================================"
echo "Test Suite: AI Suggestion Events"
echo "BASE_URL: ${BASE_URL}"
echo "========================================"
echo ""

# =========================================================
# SETUP: Stwórz testową sugestię
# =========================================================
if [[ -z "$SUGGESTION_ID" ]]; then
  echo "🆕 Setup: Tworzenie testowej sugestii..."
  CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "${BASE_URL}${ENDPOINT}" \
    -H "content-type: application/json" \
    -H "authorization: Bearer ${AUTH_TOKEN}" \
    -d "$(jq -n --arg date "$PLANNED_DATE" --arg type "$TRAINING_TYPE_CODE" \
          '{ planned_date: $date, training_type_code: $type }')" \
  )

  CREATE_BODY=$(sed '$d' <<<"$CREATE_RESPONSE")
  CREATE_STATUS=$(tail -n1 <<<"$CREATE_RESPONSE")

  if [[ "$CREATE_STATUS" != "201" ]]; then
    echo "❌ Nie udało się stworzyć sugestii (status: $CREATE_STATUS)"
    pretty_print "$CREATE_BODY"
    echo ""
    echo "💡 Hint: Jeśli daily limit został osiągnięty, użyj istniejącej sugestii:"
    echo "   SUGGESTION_ID=uuid ./ai-suggestions-events.sh"
    exit 1
  fi

  SUGGESTION_ID=$(jq -r '.data.id' <<<"$CREATE_BODY")
  echo "✅ Sugestia utworzona: $SUGGESTION_ID"
else
  echo "♻️  Setup: Używam istniejącej sugestii: $SUGGESTION_ID"
fi
echo ""

# =========================================================
# Test 1: GET events bez parametrów (default pagination)
# =========================================================
echo "📋 Test 1: GET /events bez parametrów (default pagination)"
TEST1_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/events" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
TEST1_BODY=$(sed '$d' <<<"$TEST1_RESPONSE")
TEST1_STATUS=$(tail -n1 <<<"$TEST1_RESPONSE")

echo "Status: $TEST1_STATUS"
pretty_print "$TEST1_BODY"

if [[ "$TEST1_STATUS" == "200" ]]; then
  echo "✅ Status: $TEST1_STATUS (OK)"
  ((PASSED++))
else
  echo "❌ Status: $TEST1_STATUS (Expected: 200)"
  ((FAILED++))
fi

separator

# =========================================================
# Test 2: GET events z custom pagination
# =========================================================
echo "📋 Test 2: GET /events?page=1&per_page=5"
TEST2_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/events?page=1&per_page=5" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
TEST2_BODY=$(sed '$d' <<<"$TEST2_RESPONSE")
TEST2_STATUS=$(tail -n1 <<<"$TEST2_RESPONSE")

echo "Status: $TEST2_STATUS"
pretty_print "$TEST2_BODY"

if [[ "$TEST2_STATUS" == "200" ]]; then
  echo "✅ Status: $TEST2_STATUS (OK)"
  ((PASSED++))

  # Verify pagination fields
  PAGE=$(jq -r '.page' <<<"$TEST2_BODY")
  PER_PAGE=$(jq -r '.per_page' <<<"$TEST2_BODY")

  if [[ "$PAGE" == "1" && "$PER_PAGE" == "5" ]]; then
    echo "✅ Pagination: page=$PAGE, per_page=$PER_PAGE (correct)"
  else
    echo "⚠️  Pagination: page=$PAGE, per_page=$PER_PAGE (expected: 1, 5)"
  fi
else
  echo "❌ Status: $TEST2_STATUS (Expected: 200)"
  ((FAILED++))
fi

separator

# =========================================================
# Test 3: GET events bez auth (expect 401)
# =========================================================
echo "🔒 Test 3: GET /events bez auth (expect 401)"
TEST3_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/events" \
)
TEST3_BODY=$(sed '$d' <<<"$TEST3_RESPONSE")
TEST3_STATUS=$(tail -n1 <<<"$TEST3_RESPONSE")

echo "Status: $TEST3_STATUS"
pretty_print "$TEST3_BODY"

if [[ "$TEST3_STATUS" == "401" ]]; then
  echo "✅ Status: $TEST3_STATUS (Unauthorized - correct)"
  ((PASSED++))
else
  echo "❌ Status: $TEST3_STATUS (Expected: 401)"
  ((FAILED++))
fi

separator

# =========================================================
# Test 4: GET events dla nieistniejącej sugestii (expect 404)
# =========================================================
echo "❌ Test 4: GET /events dla nieistniejącej sugestii (expect 404)"
FAKE_UUID="00000000-0000-0000-0000-000000000000"
TEST4_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${FAKE_UUID}/events" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
TEST4_BODY=$(sed '$d' <<<"$TEST4_RESPONSE")
TEST4_STATUS=$(tail -n1 <<<"$TEST4_RESPONSE")

echo "Status: $TEST4_STATUS"
pretty_print "$TEST4_BODY"

if [[ "$TEST4_STATUS" == "404" ]]; then
  echo "✅ Status: $TEST4_STATUS (Not Found - correct)"
  ((PASSED++))
else
  echo "❌ Status: $TEST4_STATUS (Expected: 404)"
  ((FAILED++))
fi

separator

# =========================================================
# Test 5: Invalid pagination (expect 400)
# =========================================================
echo "❌ Test 5: GET /events?per_page=999 (expect 400 - exceeds max)"
TEST5_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/events?per_page=999" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
TEST5_BODY=$(sed '$d' <<<"$TEST5_RESPONSE")
TEST5_STATUS=$(tail -n1 <<<"$TEST5_RESPONSE")

echo "Status: $TEST5_STATUS"
pretty_print "$TEST5_BODY"

if [[ "$TEST5_STATUS" == "400" ]]; then
  echo "✅ Status: $TEST5_STATUS (Bad Request - correct)"
  ((PASSED++))
else
  echo "❌ Status: $TEST5_STATUS (Expected: 400)"
  ((FAILED++))
fi

separator

# =========================================================
# Test 6: Zweryfikuj że pusta lista eventów jest poprawnie zwracana
# =========================================================
echo "✅ Test 6: Verify empty events list for new suggestion"
TOTAL=$(jq -r '.total' <<<"$TEST1_BODY")
DATA_LENGTH=$(jq -r '.data | length' <<<"$TEST1_BODY")

echo "Total events: $TOTAL"
echo "Data array length: $DATA_LENGTH"

if [[ "$TOTAL" == "0" && "$DATA_LENGTH" == "0" ]]; then
  echo "✅ Empty list correctly returned (total=0, data=[])"
  ((PASSED++))
else
  echo "⚠️  Expected empty list (total=0, data=[]), got total=$TOTAL, length=$DATA_LENGTH"
  ((FAILED++))
fi

separator

# =========================================================
# OPTIONAL: Test z regeneracją (aby mieć event)
# =========================================================
echo "🔁 Optional: Regenerate suggestion to create an event"
REGEN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/regenerate" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -d '{"reason": "test event creation"}' \
)
REGEN_BODY=$(sed '$d' <<<"$REGEN_RESPONSE")
REGEN_STATUS=$(tail -n1 <<<"$REGEN_RESPONSE")

if [[ "$REGEN_STATUS" == "201" ]]; then
  echo "✅ Regenerate successful (status: $REGEN_STATUS)"

  # Test 7: Verify event was created for original suggestion
  echo ""
  echo "📋 Test 7: GET /events after regenerate (should have 1 event)"
  TEST7_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X GET \
    "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/events" \
    -H "authorization: Bearer ${AUTH_TOKEN}" \
  )
  TEST7_BODY=$(sed '$d' <<<"$TEST7_RESPONSE")
  TEST7_STATUS=$(tail -n1 <<<"$TEST7_RESPONSE")

  echo "Status: $TEST7_STATUS"
  pretty_print "$TEST7_BODY"

  TOTAL_AFTER=$(jq -r '.total' <<<"$TEST7_BODY")
  EVENT_KIND=$(jq -r '.data[0].kind' <<<"$TEST7_BODY")

  if [[ "$TEST7_STATUS" == "200" && "$TOTAL_AFTER" == "1" && "$EVENT_KIND" == "regenerate" ]]; then
    echo "✅ Event created: total=$TOTAL_AFTER, kind=$EVENT_KIND"
    ((PASSED++))
  else
    echo "❌ Expected 1 regenerate event, got total=$TOTAL_AFTER, kind=$EVENT_KIND"
    ((FAILED++))
  fi
else
  echo "⚠️  Regenerate failed (status: $REGEN_STATUS), skipping event verification"
  pretty_print "$REGEN_BODY"
fi

separator

echo "========================================"
echo "✅ Test Suite zakończony!"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Sugestia ID: ${SUGGESTION_ID}"
echo "========================================"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
