#!/bin/bash

# Test User Auth Script
# ------------------------------------
# Skrypt do zarządzania testowym użytkownikiem w Supabase:
# - Sprawdza czy użytkownik istnieje (próbuje się zalogować)
# - Jeśli nie istnieje, tworzy nowego użytkownika
# - Zwraca access_token gotowy do użycia w innych skryptach
#
# Użycie:
# 1. ./auth-test-user.sh
#    Wyjście: JWT access_token na stdout
#
# 2. W innych skryptach:
#    AUTH_TOKEN=$(./auth-test-user.sh)
#    curl -H "Authorization: Bearer $AUTH_TOKEN" ...

set -euo pipefail

# Konfiguracja (z .env lub domyślne wartości dla local dev)
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SUPABASE_KEY="${SUPABASE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"

# Dane testowego użytkownika
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-password123}"

# Tryb verbose (ustaw 1 aby zobaczyć szczegóły, domyślnie tylko token)
VERBOSE="${VERBOSE:-0}"

# Helper: logowanie do stderr (żeby nie psuć stdout z tokenem)
log() {
  if [[ "$VERBOSE" == "1" ]]; then
    echo "$@" >&2
  fi
}

# Helper: wyciągnij access_token z odpowiedzi JSON
extract_token() {
  local response="$1"
  echo "$response" | jq -r '.access_token // empty'
}

# =========================================================
# 1) Próba logowania
# =========================================================
log "🔐 Próba logowania jako: ${TEST_EMAIL}"

SIGNIN_RESPONSE=$(curl -s \
  -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg email "$TEST_EMAIL" --arg pwd "$TEST_PASSWORD" \
        '{ email: $email, password: $pwd }')" \
)

ACCESS_TOKEN=$(extract_token "$SIGNIN_RESPONSE")

# Jeśli token istnieje, użytkownik jest zalogowany
if [[ -n "$ACCESS_TOKEN" && "$ACCESS_TOKEN" != "null" ]]; then
  log "✅ Użytkownik istnieje i jest zalogowany."
  echo "$ACCESS_TOKEN"
  exit 0
fi

# =========================================================
# 2) Użytkownik nie istnieje → rejestracja
# =========================================================
log "⚠️  Użytkownik nie istnieje. Tworzenie nowego konta..."

SIGNUP_RESPONSE=$(curl -s \
  -X POST \
  "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg email "$TEST_EMAIL" --arg pwd "$TEST_PASSWORD" \
        '{
          email: $email,
          password: $pwd,
          email_confirm: true
        }')" \
)

# Supabase signup zwraca access_token od razu po rejestracji
ACCESS_TOKEN=$(extract_token "$SIGNUP_RESPONSE")

if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  log "❌ Nie udało się utworzyć użytkownika."
  log "Response: $SIGNUP_RESPONSE"
  exit 1
fi

log "✅ Użytkownik utworzony i zalogowany."
echo "$ACCESS_TOKEN"
exit 0
