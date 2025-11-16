import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { PaceUnit, PaceUnitContextType } from "../../lib/types/ui";

// Klucz localStorage dla jednostki tempa
const PACE_UNIT_STORAGE_KEY = "paceUnit";

// Domyślna jednostka tempa
const DEFAULT_PACE_UNIT: PaceUnit = "min/km";

// Tworzenie kontekstu
const PaceUnitContext = createContext<PaceUnitContextType | undefined>(undefined);

interface PaceUnitProviderProps {
  children: ReactNode;
}

/**
 * Provider zarządzający globalnym stanem jednostki tempa.
 * Odczytuje początkową wartość z localStorage i synchronizuje zmiany.
 */
export function PaceUnitProvider({ children }: PaceUnitProviderProps) {
  const [paceUnit, setPaceUnitState] = useState<PaceUnit>(DEFAULT_PACE_UNIT);
  const [isInitialized, setIsInitialized] = useState(false);

  // Odczyt z localStorage przy pierwszym renderze (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PACE_UNIT_STORAGE_KEY);

      // Walidacja: sprawdź czy wartość jest poprawna
      if (stored === "min/km" || stored === "km/h") {
        setPaceUnitState(stored);
      } else if (stored) {
        // Niepoprawna wartość - ustaw domyślną i nadpisz w localStorage
        console.warn(`Invalid pace unit in localStorage: "${stored}". Using default.`);
        localStorage.setItem(PACE_UNIT_STORAGE_KEY, DEFAULT_PACE_UNIT);
      }
    } catch (error) {
      // localStorage niedostępny (np. tryb prywatny)
      console.warn("localStorage not available, pace unit will not be persisted:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Funkcja aktualizująca stan i localStorage
  const setPaceUnit = (unit: PaceUnit) => {
    setPaceUnitState(unit);

    try {
      localStorage.setItem(PACE_UNIT_STORAGE_KEY, unit);
    } catch (error) {
      console.warn("Failed to save pace unit to localStorage:", error);
    }
  };

  // Nie renderuj children dopóki nie zainicjalizowano stanu z localStorage
  // To zapobiega "flashowi" niepoprawnej wartości
  if (!isInitialized) {
    return null;
  }

  return <PaceUnitContext.Provider value={{ paceUnit, setPaceUnit }}>{children}</PaceUnitContext.Provider>;
}

/**
 * Hook do łatwego dostępu do kontekstu jednostki tempa.
 * Musi być używany wewnątrz PaceUnitProvider.
 */
export function usePaceUnit(): PaceUnitContextType {
  const context = useContext(PaceUnitContext);

  if (context === undefined) {
    throw new Error("usePaceUnit must be used within PaceUnitProvider");
  }

  return context;
}
