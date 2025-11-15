# E2E Test IDs - Onboarding Flow

Mapowanie wszystkich `data-testid` dla scenariusza E2E: **Login → Onboarding → Calendar**

## Scenariusz testowy

1. **Login** - zaloguj użytkownika z credentials z `.env.test`
2. **Onboarding** - wypełnij formularz 3 treningów
3. **Calendar** - upewnij się że widok kalendarza się wyświetlił

---

## 1. Login Page (`/login`)

### LoginForm Component

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Email input | `login-email-input` | input[type="email"] | Pole email użytkownika |
| Password input | `login-password-input` | input[type="password"] | Pole hasła |
| Submit button | `login-submit-button` | button[type="submit"] | Przycisk "Zaloguj się" |
| Error message | `login-error-message` | div | Komunikat błędu logowania (jeśli wystąpił) |

**Przykład użycia w teście**:
```typescript
// Login scenario
await page.getByTestId('login-email-input').fill(process.env.E2E_USERNAME);
await page.getByTestId('login-password-input').fill(process.env.E2E_PASSWORD);
await page.getByTestId('login-submit-button').click();

// Wait for redirect to onboarding
await page.waitForURL('/onboarding');
```

---

## 2. Onboarding Page (`/onboarding`)

### OnboardingView Component

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Main container | `onboarding-view` | div | Główny kontener widoku onboardingu |
| Step title | `onboarding-step-title` | h2 | Tytuł aktualnego kroku (np. "Trening 1 z 3") |

### Stepper Component

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Stepper container | `onboarding-stepper` | div | Kontener wskaźnika postępu |
| Step 1 indicator | `onboarding-step-1` | div | Kółko kroku 1 (zielone ✓ gdy ukończone) |
| Step 2 indicator | `onboarding-step-2` | div | Kółko kroku 2 |
| Step 3 indicator | `onboarding-step-3` | div | Kółko kroku 3 |

**Stan kroków**:
- `bg-green-500` + "✓" - ukończony
- `bg-blue-600` + numer - aktualny
- `bg-gray-300` + numer - oczekujący

### WorkoutOnboardingForm Component

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Form | `workout-onboarding-form` | form | Główny formularz treningu |
| Distance input | `workout-distance-input` | input[type="number"] | Dystans w km (np. 5.5) |
| Avg HR input | `workout-avghr-input` | input[type="number"] | Średnie tętno w bpm (np. 145) |
| Date input | `workout-date-input` | input[type="date"] | Data treningu (YYYY-MM-DD) |
| Submit button | `workout-submit-button` | button[type="submit"] | Przycisk "Dalej" (step 1-2) / "Zakończ" (step 3) |

**Error messages** (wyświetlane tylko gdy walidacja niepoprawna):
| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Distance error | `workout-error-distance` | p | Błąd walidacji dystansu |
| Duration error | `workout-error-duration` | p | Błąd walidacji czasu trwania |
| Avg HR error | `workout-error-avghr` | p | Błąd walidacji tętna |
| Date error | `workout-error-date` | p | Błąd walidacji daty |

### DurationInput Component (w ramach WorkoutOnboardingForm)

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Hours input | `duration-hours-input` | input[type="number"] | Godziny (0-23) |
| Minutes input | `duration-minutes-input` | input[type="number"] | Minuty (0-59) |
| Seconds input | `duration-seconds-input` | input[type="number"] | Sekundy (0-59) |

**Przykład użycia w teście**:
```typescript
// Fill workout #1
await page.getByTestId('workout-distance-input').fill('5.5');
await page.getByTestId('duration-hours-input').fill('0');
await page.getByTestId('duration-minutes-input').fill('30');
await page.getByTestId('duration-seconds-input').fill('15');
await page.getByTestId('workout-avghr-input').fill('145');
await page.getByTestId('workout-date-input').fill('2024-11-01');
await page.getByTestId('workout-submit-button').click();

// Wait for step 2
await expect(page.getByTestId('onboarding-step-title')).toHaveText('Trening 2 z 3');

// Repeat for workout #2 and #3
// After workout #3, wait for redirect to calendar
await page.waitForURL('/');
```

---

## 3. Calendar Page (`/`)

### CalendarView Component

| Element | data-testid | Typ | Opis |
|---------|-------------|-----|------|
| Main container | `calendar-view` | div | Główny kontener widoku kalendarza |

**Przykład użycia w teście**:
```typescript
// Verify calendar view is visible after onboarding
await expect(page.getByTestId('calendar-view')).toBeVisible();
```

---

## Reguły walidacji formularza onboardingu

### Distance (Dystans)
- **Min**: 0.1 km
- **Format**: liczba zmiennoprzecinkowa (step="0.1")
- **Error**: "Dystans musi być większy niż 0.1 km"

### Duration (Czas trwania)
- **Min total**: 60 sekund (1 minuta)
- **Format**: HH (0-23), MM (0-59), SS (0-59)
- **Error**: "Czas trwania musi być dłuższy niż 60 sekund"

### Average Heart Rate (Średnie tętno)
- **Range**: 40-220 bpm
- **Format**: liczba całkowita
- **Error**: "Tętno musi być w zakresie 40-220 bpm"

### Completed At (Data treningu)
- **Constraint**: Musi być w przeszłości lub dzisiaj
- **Format**: YYYY-MM-DD (date input)
- **Max**: dzisiejsza data
- **Error**: "Data treningu musi być z przeszłości"

---

## Environment Variables (.env.test)

```bash
# Credentials for E2E testing (example)
E2E_USERNAME=test@example.com
E2E_PASSWORD=testpassword123
```

⚠️ **Uwaga**: Plik `.env.test` nie jest dostępny z poziomu AI, ale jest już skonfigurowany w projekcie.

---

## Pełny przykład testu E2E

```typescript
import { test, expect } from '@playwright/test';

test('complete onboarding flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(process.env.E2E_USERNAME!);
  await page.getByTestId('login-password-input').fill(process.env.E2E_PASSWORD!);
  await page.getByTestId('login-submit-button').click();

  // Wait for redirect to onboarding
  await page.waitForURL('/onboarding');
  await expect(page.getByTestId('onboarding-view')).toBeVisible();

  // 2. Fill workout #1
  await expect(page.getByTestId('onboarding-step-title')).toHaveText('Trening 1 z 3');
  await page.getByTestId('workout-distance-input').fill('5.5');
  await page.getByTestId('duration-hours-input').fill('0');
  await page.getByTestId('duration-minutes-input').fill('30');
  await page.getByTestId('duration-seconds-input').fill('15');
  await page.getByTestId('workout-avghr-input').fill('145');
  await page.getByTestId('workout-date-input').fill('2024-11-10');
  await page.getByTestId('workout-submit-button').click();

  // Verify step 2
  await expect(page.getByTestId('onboarding-step-1')).toHaveClass(/bg-green-500/);
  await expect(page.getByTestId('onboarding-step-1')).toHaveText('✓');
  await expect(page.getByTestId('onboarding-step-title')).toHaveText('Trening 2 z 3');

  // 3. Fill workout #2
  await page.getByTestId('workout-distance-input').fill('8.0');
  await page.getByTestId('duration-hours-input').fill('0');
  await page.getByTestId('duration-minutes-input').fill('45');
  await page.getByTestId('duration-seconds-input').fill('30');
  await page.getByTestId('workout-avghr-input').fill('155');
  await page.getByTestId('workout-date-input').fill('2024-11-12');
  await page.getByTestId('workout-submit-button').click();

  // Verify step 3
  await expect(page.getByTestId('onboarding-step-2')).toHaveClass(/bg-green-500/);
  await expect(page.getByTestId('onboarding-step-title')).toHaveText('Trening 3 z 3');

  // 4. Fill workout #3
  await page.getByTestId('workout-distance-input').fill('10.0');
  await page.getByTestId('duration-hours-input').fill('1');
  await page.getByTestId('duration-minutes-input').fill('0');
  await page.getByTestId('duration-seconds-input').fill('0');
  await page.getByTestId('workout-avghr-input').fill('150');
  await page.getByTestId('workout-date-input').fill('2024-11-14');
  await page.getByTestId('workout-submit-button').click();

  // 5. Verify redirect to calendar
  await page.waitForURL('/');
  await expect(page.getByTestId('calendar-view')).toBeVisible();
});
```

---

## Wskazówki dla testerów

1. **Czekaj na nawigację**: Używaj `waitForURL()` po akcjach powodujących przekierowanie
2. **Weryfikuj stan kroków**: Sprawdzaj kolory i ikony w Stepper (✓ dla ukończonych)
3. **Testuj walidację**: Próbuj niepoprawnych danych i sprawdzaj `workout-error-*` elementy
4. **Loading states**: Submit button ma tekst "Zapisywanie..." gdy `isLoading=true`
5. **Parallel API calls**: Step 3 wysyła 3 requesty równolegle do `/api/v1/workouts`

---

**Utworzono**: 2024-11-15
**Status**: ✅ Wszystkie data-testid dodane do komponentów
**Gotowość**: Komponenty przygotowane do testów E2E
