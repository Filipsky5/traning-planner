# Product Requirements Document (PRD): Planer Biegowy AI - Wersja MVP

## 1. Wprowadzenie i Cel 🎯

**Produkt:** Aplikacja webowa, która generuje spersonalizowane propozycje treningów biegowych przy użyciu AI.

**Problem:** Planowanie treningów biegowych jest trudne dla początkujących i średniozaawansowanych biegaczy. Aplikacja eliminuje potrzebę posiadania specjalistycznej wiedzy, dostarczając proste i zróżnicowane sugestie treningowe.

**Cel MVP:** Szybkie zweryfikowanie hipotezy, że użytkownicy zaufają sugestiom AI i będą regularnie korzystać z aplikacji do planowania swoich biegów.

---

## 2. Persony Użytkowników

* **Początkująca Ania:** Zaczyna biegać, ma za sobą kilka nieregularnych treningów. Chce biegać systematycznie, ale nie wie, jak zaplanować swoje treningi, aby uniknąć błędów i monotonii.
* **Biegacz Tomek:** Biega od roku 2-3 razy w tygodniu, ale bez konkretnego planu. Chce poprawić swoje wyniki i wprowadzić do swoich treningów więcej struktury, ale nie chce korzystać ze skomplikowanych, płatnych planów.

---

## 3. Główne Funkcjonalności (Epiki)

* Rejestracja i Onboarding Użytkownika
* Generowanie Sugestii Treningowych przez AI
* Zarządzanie Treningami (Dodawanie/Edycja/Usuwanie)
* Wizualizacja Planu w Kalendarzu
* System Zbierania Ocen Treningów

---

## 4. Szczegółowe Wymagania i Przepływy Użytkownika

### Onboarding
* Użytkownik po rejestracji musi dodać **dokładnie 3 swoje ostatnie treningi**, aby AI miało dane startowe.
* Interfejs udostępnia **przykładowe dane** (np. "Spacer 30 min", "Lekki trucht 15 min"), które można wpisać, aby obniżyć barierę wejścia.
* Użytkownik opcjonalnie odpowiada na pytanie o cel (np. "Biegać dla zdrowia", "Przebiec X km"), z informacją, że dane te posłużą do ulepszenia aplikacji w przyszłości.

### Generowanie Treningu (AI)
* **Tryb Kalibracji:** Pierwsze **3 treningi** wygenerowane przez AI służą "wyczuciu" użytkownika. Powinny być bardziej zachowawcze i zróżnicowane, aby zebrać dane na temat reakcji użytkownika.
* **Logika Progresji:** Po trybie kalibracji, jeśli 3 ostatnie treningi danego typu (np. Bieg Spokojny) zostaną ocenione jako "W sam raz" lub "Za łatwy", kolejna propozycja tego typu będzie miała nieznacznie (np. o 10%) zwiększony dystans.
* **Struktura i Treść:** AI zawsze generuje trening o strukturze: **Rozgrzewka, Część główna, Schłodzenie**. Sugerowane tempa są określane przez AI na podstawie analizy **średniego tempa** z historycznych biegów użytkownika.
* **Interfejs:** Propozycja treningu pojawia się w **oknie modalnym** z przyciskami "Akceptuj i dodaj do planu" oraz "Odrzuć i wygeneruj nowy". Użytkownik ma limit **3 re-generacji** na dzień.

### Zarządzanie Treningami
* Użytkownik ręcznie dodaje zrealizowane treningi, podając **dystans, czas trwania i średnie tętno**.
* Zaplanowany trening jest potwierdzany przez otwarcie formularza z danymi planu, które użytkownik modyfikuje, wpisując faktyczne wyniki.
* Użytkownik może **edytować i usuwać** historyczne treningi. Funkcja edycji zostanie usunięta po wprowadzeniu wsparcia dla plików .FIT w przyszłości.
* Po potwierdzeniu wykonania treningu, użytkownik może go ocenić ("Za łatwy", "W sam raz", "Za trudny").

### Kalendarz i Widok Detali
* **Widok kalendarza** jest głównym ekranem aplikacji. Wyświetla treningi zróżnicowane za pomocą **kolorów lub ikon** odpowiadających typowi treningu.
* Puste dni w kalendarzu mają ikonę **"+"** do inicjowania generowania treningu.
* Widok szczegółów treningu **nie zawiera żadnych wykresów**. Prezentuje kluczowe metryki w formie **numerycznej** (dystans, czas, śr. tętno, śr. tempo) oraz ocenę wystawioną przez użytkownika.

---

## 5. Co NIE Wchodzi w Zakres MVP 🚫

* **Import plików .FIT, GPX** lub jakichkolwiek innych.
* **Integracje** z zewnętrznymi aplikacjami (Strava, Garmin Connect etc.).
* **Wykresy** i zaawansowane wizualizacje danych.
* Funkcje **społecznościowe** (udostępnianie, komentowanie).
* Aplikacje mobilne.

---

## 6. Kryteria Sukcesu i Mierniki ✅

* **Wskaźnik Akceptacji:** 75% treningów wygenerowanych przez AI jest akceptowanych (kliknięcie "Akceptuj i dodaj do planu").
* **Wskaźnik Wykorzystania AI:** 75% wszystkich treningów dodanych do kalendarza pochodzi z generatora AI (a nie jest dodawanych w pełni ręcznie).
* **Jakościowy Wskaźnik Satysfakcji:** Dążenie do tego, aby większość ocenianych treningów otrzymywała ocenę "W sam raz".