#!/bin/bash

# Test Suite dla OpenRouter Service
# Testuje podstawową funkcjonalność integracji z OpenRouter API
#
# Przed uruchomieniem:
# 1. Upewnij się że .env zawiera OPENROUTER_API_KEY
# 2. Uruchom dev server: npm run dev
# 3. Opcjonalnie: uruchom Supabase local (supabase start) dla logowania AI

# Zmienne
BASE_URL="http://localhost:3000"

# Wczytaj OpenRouter API key z .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Plik .env nie istnieje: $ENV_FILE"
  echo "   Skopiuj .env.example do .env i uzupełnij wartości"
  exit 1
fi

# Odczytaj OPENROUTER_API_KEY z .env
OPENROUTER_KEY=$(grep -E "^OPENROUTER_API_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [[ -z "$OPENROUTER_KEY" ]] || [[ "$OPENROUTER_KEY" == "###" ]]; then
  echo "❌ OPENROUTER_API_KEY nie znaleziony lub nie ustawiony w .env"
  echo "   Dodaj do .env:"
  echo "   OPENROUTER_API_KEY=sk-or-v1-twój-klucz-tutaj"
  echo "   Zarejestruj się na https://openrouter.ai aby otrzymać klucz API"
  exit 1
fi

echo "✅ OpenRouter API key załadowany z .env (${#OPENROUTER_KEY} znaków)"
echo ""

# Pobierz user token dla testów
echo "🔐 Pobieranie user token..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh" 2>/dev/null)

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "⚠️  Nie udało się uzyskać user token - testy wymagające autentykacji zostaną pominięte"
  echo "   Uruchom najpierw Supabase local: supabase start"
  HAS_USER_TOKEN=false
else
  echo "✅ User token uzyskany (test@example.com)"
  HAS_USER_TOKEN=true
fi
echo ""

echo "======================================"
echo "Test Suite: OpenRouter Service"
echo "======================================"
echo ""
echo "UWAGA: Te testy wykonują prawdziwe wywołania API OpenRouter"
echo "       i mogą generować małe koszty (zazwyczaj < $0.01 per test)"
echo ""
read -p "Kontynuować testy? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Testy przerwane przez użytkownika"
  exit 0
fi
echo ""

# ==================== TESTY GENEROWANIA SUGESTII ====================

if [[ "$HAS_USER_TOKEN" == true ]]; then
  # Test 1: POST /api/v1/ai-suggestions - generowanie sugestii → 201 Created
  echo "📝 Test 1: POST generowanie sugestii treningowej (easy run)"
  echo "Oczekiwany status: 201 Created"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}/api/v1/ai-suggestions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "planned_date": "2025-11-20",
      "training_type_code": "easy",
      "context": {
        "note": "Test sugestii z OpenRouter"
      }
    }'
  echo -e "\n\n"

  # Test 2: POST z innym typem treningu → 201 Created
  echo "📝 Test 2: POST generowanie sugestii (tempo run)"
  echo "Oczekiwany status: 201 Created"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}/api/v1/ai-suggestions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "planned_date": "2025-11-22",
      "training_type_code": "tempo",
      "context": {
        "note": "Test tempo run"
      }
    }'
  echo -e "\n\n"

  # Test 3: GET lista sugestii - sprawdź czy nowe sugestie zostały utworzone
  echo "📝 Test 3: GET lista sugestii (powinny zawierać wygenerowane sugestie)"
  echo "Oczekiwany status: 200 OK"
  echo "---"
  curl -v \
    -X GET \
    "${BASE_URL}/api/v1/ai-suggestions?per_page=5" \
    -H "Authorization: Bearer ${AUTH_TOKEN}"
  echo -e "\n\n"

  # Test 4: Validacja - brak wymaganego pola → 422 Unprocessable Entity
  echo "❌ Test 4: POST validation error (brak training_type_code)"
  echo "Oczekiwany status: 422 Unprocessable Entity"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}/api/v1/ai-suggestions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "planned_date": "2025-11-20"
    }'
  echo -e "\n\n"

  # Test 5: Validacja - nieprawidłowa data → 422 Unprocessable Entity
  echo "❌ Test 5: POST validation error (nieprawidłowy format daty)"
  echo "Oczekiwany status: 422 Unprocessable Entity"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}/api/v1/ai-suggestions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "planned_date": "invalid-date",
      "training_type_code": "easy"
    }'
  echo -e "\n\n"

  # Test 6: Nieprawidłowy training_type_code → 422 Unprocessable Entity
  echo "❌ Test 6: POST validation error (nieprawidłowy training_type_code)"
  echo "Oczekiwany status: 422 Unprocessable Entity"
  echo "---"
  curl -v \
    -X POST \
    "${BASE_URL}/api/v1/ai-suggestions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "planned_date": "2025-11-20",
      "training_type_code": "nonexistent"
    }'
  echo -e "\n\n"
else
  echo "⏭️  Testy generowania sugestii pominięte (brak user token)"
  echo "   Aby uruchomić wszystkie testy, uruchom Supabase local: supabase start"
  echo ""
fi

# ==================== TESTY AUTENTYKACJI ====================

# Test 7: Brak autoryzacji → 401 Unauthorized
echo "🔒 Test 7: POST bez Authorization header"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}/api/v1/ai-suggestions" \
  -H "Content-Type: application/json" \
  -d '{
    "planned_date": "2025-11-20",
    "training_type_code": "easy"
  }'
echo -e "\n\n"

# Test 8: Nieprawidłowy token → 401 Unauthorized
echo "🔒 Test 8: POST z nieprawidłowym tokenem"
echo "Oczekiwany status: 401 Unauthorized"
echo "---"
curl -v \
  -X POST \
  "${BASE_URL}/api/v1/ai-suggestions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-12345" \
  -d '{
    "planned_date": "2025-11-20",
    "training_type_code": "easy"
  }'
echo -e "\n\n"

echo "======================================"
echo "✅ Test Suite zakończony"
echo "======================================"
echo ""
echo "Uwagi:"
echo "- Testy 1-6 wymagają działającego Supabase local (supabase start)"
echo "- Wszystkie testy wykonują prawdziwe wywołania OpenRouter API"
echo "- Sprawdź logi AI w tabeli ai_logs aby zobaczyć metryki wykorzystania"
echo "- Koszty pojedynczego testu to zazwyczaj $0.001-0.01 (w zależności od modelu)"
echo ""
echo "Aby sprawdzić logi AI:"
echo "  ./.curls/ai-logs.sh"
echo ""
