#!/bin/bash

# Test Suite: AI Suggestions Endpointy
# ------------------------------------
# Zakres testów:
# - GET    /api/v1/ai/suggestions           (lista)
# - POST   /api/v1/ai/suggestions           (tworzenie)
# - GET    /api/v1/ai/suggestions/{id}      (szczegóły)
# - POST   /api/v1/ai/suggestions/{id}/accept     (akceptacja → workout)
# - POST   /api/v1/ai/suggestions/{id}/reject     (odrzucenie)
# - POST   /api/v1/ai/suggestions/{id}/regenerate (regeneracja)
#
# Instrukcje:
# 1. Uruchom środowisko lokalne (Supabase + `npm run dev`).
# 2. Zaloguj się w aplikacji i pobierz ważny session token (JWT).
# 3. Uzupełnij zmienną AUTH_TOKEN poniżej.
# 4. Opcjonalnie dostosuj domyślne daty / typy treningu.

set -euo pipefail

BASE_URL="http://localhost:3000"
ENDPOINT="/api/v1/ai/suggestions"
AUTH_TOKEN="YOUR_SESSION_TOKEN_HERE"

# Konfiguracja testu
TRAINING_TYPE_CODE="easy"
PLANNED_DATE=$(date -u +"%Y-%m-%d")
POSITION=1

SUGGESTION_ID=""
ACCEPTED_WORKOUT_ID=""

pretty_print() {
  jq '.' <<<"$1"
}

separator() {
  echo ""
  echo "----------------------------------------"
  echo ""
}

require_auth_token() {
  if [[ "$AUTH_TOKEN" == "YOUR_SESSION_TOKEN_HERE" ]]; then
    echo "❌ Uzupełnij AUTH_TOKEN przed uruchomieniem skryptu."
    exit 1
  fi
}

echo "========================================"
echo "Test Suite: AI Suggestions"
echo "BASE_URL: ${BASE_URL}"
echo "TRAINING_TYPE_CODE: ${TRAINING_TYPE_CODE}"
echo "PLANNED_DATE: ${PLANNED_DATE}"
echo "========================================"
echo ""

require_auth_token

# =========================================================
# 1) POST /api/v1/ai/suggestions  → utworzenie sugestii
# =========================================================
echo "🆕  Test 1: POST create suggestion"
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

echo "Status: $CREATE_STATUS"
pretty_print "$CREATE_BODY"
separator

if [[ "$CREATE_STATUS" != "201" ]]; then
  echo "❌ Oczekiwany status 201, przerwanie testu."
  exit 1
fi

SUGGESTION_ID=$(jq -r '.data.id' <<<"$CREATE_BODY")
if [[ -z "$SUGGESTION_ID" || "$SUGGESTION_ID" == "null" ]]; then
  echo "❌ Nie udało się pobrać suggestion_id z odpowiedzi."
  exit 1
fi

# =========================================================
# 2) GET /api/v1/ai/suggestions/{id}  → szczegóły sugestii
# =========================================================
echo "🔍  Test 2: GET suggestion detail"
DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
DETAIL_BODY=$(sed '$d' <<<"$DETAIL_RESPONSE")
DETAIL_STATUS=$(tail -n1 <<<"$DETAIL_RESPONSE")

echo "Status: $DETAIL_STATUS"
pretty_print "$DETAIL_BODY"
separator

if [[ "$DETAIL_STATUS" != "200" ]]; then
  echo "❌ Oczekiwany status 200."
  exit 1
fi

# =========================================================
# 3) GET /api/v1/ai/suggestions  → lista z filtrem
# =========================================================
echo "📋  Test 3: GET suggestions list (status=shown)"
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}${ENDPOINT}?status=shown&per_page=5" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
LIST_BODY=$(sed '$d' <<<"$LIST_RESPONSE")
LIST_STATUS=$(tail -n1 <<<"$LIST_RESPONSE")

echo "Status: $LIST_STATUS"
pretty_print "$LIST_BODY"
separator

if [[ "$LIST_STATUS" != "200" ]]; then
  echo "❌ Oczekiwany status 200."
  exit 1
fi

# =========================================================
# 4) POST /api/v1/ai/suggestions/{id}/accept
# =========================================================
echo "✅  Test 4: POST accept suggestion"
ACCEPT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/accept" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -d "$(jq -n --argjson pos "$POSITION" '{ position: $pos }')" \
)
ACCEPT_BODY=$(sed '$d' <<<"$ACCEPT_RESPONSE")
ACCEPT_STATUS=$(tail -n1 <<<"$ACCEPT_RESPONSE")

echo "Status: $ACCEPT_STATUS"
pretty_print "$ACCEPT_BODY"
separator

if [[ "$ACCEPT_STATUS" != "201" ]]; then
  echo "❌ Oczekiwany status 201."
  exit 1
fi

ACCEPTED_WORKOUT_ID=$(jq -r '.data.id' <<<"$ACCEPT_BODY")

# =========================================================
# 5) POST /api/v1/ai/suggestions/{id}/regenerate
# =========================================================
echo "🔁  Test 5: POST regenerate suggestion"
REGENERATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/regenerate" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -d '{ "reason": "need variation", "adjustment_hint": "-10% distance" }' \
)
REGENERATE_BODY=$(sed '$d' <<<"$REGENERATE_RESPONSE")
REGENERATE_STATUS=$(tail -n1 <<<"$REGENERATE_RESPONSE")

echo "Status: $REGENERATE_STATUS"
pretty_print "$REGENERATE_BODY"
separator

if [[ "$REGENERATE_STATUS" != "201" ]]; then
  echo "❌ Oczekiwany status 201."
  exit 1
fi

REGenerated_ID=$(jq -r '.data.id' <<<"$REGENERATE_BODY")

# =========================================================
# 6) POST /api/v1/ai/suggestions/{new_id}/reject
# =========================================================
echo "🚫  Test 6: POST reject regenerated suggestion"
REJECT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${REGenerated_ID}/reject" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
)
REJECT_BODY=$(sed '$d' <<<"$REJECT_RESPONSE")
REJECT_STATUS=$(tail -n1 <<<"$REJECT_RESPONSE")

echo "Status: $REJECT_STATUS"
pretty_print "$REJECT_BODY"
separator

if [[ "$REJECT_STATUS" != "200" ]]; then
  echo "❌ Oczekiwany status 200."
  exit 1
fi

# =========================================================
# 7) Edge case: akceptacja już zaakceptowanej sugestii
# =========================================================
echo "⚠️  Test 7: POST accept on already accepted suggestion (expect 409)"
ACCEPT_CONFLICT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}${ENDPOINT}/${SUGGESTION_ID}/accept" \
  -H "content-type: application/json" \
  -H "authorization: Bearer ${AUTH_TOKEN}" \
  -d "$(jq -n --argjson pos "$POSITION" '{ position: $pos }')" \
)
ACCEPT_CONFLICT_BODY=$(sed '$d' <<<"$ACCEPT_CONFLICT_RESPONSE")
ACCEPT_CONFLICT_STATUS=$(tail -n1 <<<"$ACCEPT_CONFLICT_RESPONSE")

echo "Status: $ACCEPT_CONFLICT_STATUS"
pretty_print "$ACCEPT_CONFLICT_BODY"
separator

if [[ "$ACCEPT_CONFLICT_STATUS" != "409" ]]; then
  echo "⚠️  Oczekiwany status 409 (konflikt)."
else
  echo "✅  Konflikt poprawnie obsłużony."
fi

echo "========================================"
echo "Test Suite zakończony."
echo "Sugestia początkowa ID: ${SUGGESTION_ID}"
echo "Workout utworzony ID: ${ACCEPTED_WORKOUT_ID}"
echo "Regenerowana sugestia ID: ${REGenerated_ID}"
echo "========================================"

