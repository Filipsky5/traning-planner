/**
 * Definiuje dostępne jednostki tempa.
 * 'min/km' - minuty na kilometr
 * 'km/h' - kilometry na godzinę
 */
export type PaceUnit = "min/km" | "km/h";

/**
 * Struktura kontekstu React dla jednostki tempa.
 */
export interface PaceUnitContextType {
  paceUnit: PaceUnit;
  setPaceUnit: (unit: PaceUnit) => void;
}
