/**
 * Unit tests for calendarQuerySchema validation
 *
 * Tests cover:
 * - Required fields (start, end)
 * - Date format validation (YYYY-MM-DD regex)
 * - Optional status field (enum validation)
 * - Date range validation (end >= start)
 * - Semantically invalid dates handling
 */

import { describe, it, expect } from "vitest";
import { calendarQuerySchema } from "./workouts";
import { ZodError } from "zod";

describe("calendarQuerySchema", () => {
  // ========================================
  // HAPPY PATH - Poprawne dane
  // ========================================

  describe("valid inputs", () => {
    it("should accept valid monthly range without status", () => {
      const input = {
        start: "2025-01-01",
        end: "2025-01-31",
      };

      const result = calendarQuerySchema.parse(input);

      expect(result).toEqual({
        start: "2025-01-01",
        end: "2025-01-31",
        status: undefined,
      });
    });

    it("should accept single day range (start === end)", () => {
      const input = {
        start: "2025-02-15",
        end: "2025-02-15",
      };

      const result = calendarQuerySchema.parse(input);

      expect(result.start).toBe("2025-02-15");
      expect(result.end).toBe("2025-02-15");
    });

    it("should accept each allowed status value", () => {
      const statuses = ["planned", "completed", "skipped", "canceled"] as const;

      statuses.forEach((status) => {
        const input = {
          start: "2025-03-01",
          end: "2025-03-31",
          status,
        };

        const result = calendarQuerySchema.parse(input);

        expect(result.status).toBe(status);
        expect(result.start).toBe("2025-03-01");
        expect(result.end).toBe("2025-03-31");
      });
    });
  });

  // ========================================
  // VALIDATION ERRORS - Brakujące pola
  // ========================================

  describe("missing required fields", () => {
    it("should reject missing start", () => {
      const input = {
        end: "2025-01-31",
      };

      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);

      try {
        calendarQuerySchema.parse(input);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        const startError = zodError.issues.find((issue) => issue.path[0] === "start");
        expect(startError).toBeDefined();
      }
    });

    it("should reject missing end", () => {
      const input = {
        start: "2025-01-01",
      };

      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);

      try {
        calendarQuerySchema.parse(input);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        const endError = zodError.issues.find((issue) => issue.path[0] === "end");
        expect(endError).toBeDefined();
      }
    });
  });

  // ========================================
  // VALIDATION ERRORS - Format daty
  // ========================================

  describe("date format validation", () => {
    const invalidFormats = [
      { value: "2025/01/01", name: "slash separator" },
      { value: "2025-1-1", name: "single digit month/day" },
      { value: "01-01-2025", name: "DD-MM-YYYY format" },
      { value: "2025-01-1", name: "single digit day" },
      { value: "2025-1-01", name: "single digit month" },
    ];

    invalidFormats.forEach(({ value, name }) => {
      it(`should reject invalid start format (${name})`, () => {
        const input = {
          start: value,
          end: "2025-01-31",
        };

        expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);
      });

      it(`should reject invalid end format (${name})`, () => {
        const input = {
          start: "2025-01-01",
          end: value,
        };

        expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);
      });
    });
  });

  // ========================================
  // VALIDATION ERRORS - Zakres dat
  // ========================================

  describe("date range validation", () => {
    it("should reject end < start", () => {
      const input = {
        start: "2025-02-10",
        end: "2025-02-01",
      };

      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);

      try {
        calendarQuerySchema.parse(input);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        const rangeError = zodError.issues.find((issue) => issue.message.includes("End date must be >= start date"));
        expect(rangeError).toBeDefined();
      }
    });

    it("should reject semantically invalid dates (month 13)", () => {
      const input = {
        start: "2025-13-01",
        end: "2025-13-10",
      };

      // Regex przepuści, ale refine złapie Invalid Date
      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);

      try {
        calendarQuerySchema.parse(input);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        // Błąd z refine
        const rangeError = zodError.issues.find((issue) => issue.message.includes("End date must be >= start date"));
        expect(rangeError).toBeDefined();
      }
    });

    it("should reject semantically invalid dates (day 32)", () => {
      const input = {
        start: "2025-01-32",
        end: "2025-02-01",
      };

      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);
    });
  });

  // ========================================
  // VALIDATION ERRORS - Status
  // ========================================

  describe("status validation", () => {
    it("should reject invalid status value", () => {
      const input = {
        start: "2025-01-01",
        end: "2025-01-31",
        status: "archived" as any,
      };

      expect(() => calendarQuerySchema.parse(input)).toThrow(ZodError);

      try {
        calendarQuerySchema.parse(input);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodError = err as ZodError;
        const statusError = zodError.issues.find((issue) => issue.path[0] === "status");
        expect(statusError).toBeDefined();
      }
    });
  });

  // ========================================
  // EDGE CASES - Nadmiarowe pola
  // ========================================

  describe("extra fields handling", () => {
    it("should allow extra fields (schema is not strict)", () => {
      const input = {
        start: "2025-01-01",
        end: "2025-01-31",
        foo: "bar",
      } as any;

      // Schema nie jest strict(), więc nadmiarowe pola są przepuszczane
      const result = calendarQuerySchema.parse(input);

      expect(result.start).toBe("2025-01-01");
      expect(result.end).toBe("2025-01-31");
      // foo jest zignorowane w typie, ale może być w obiekcie
    });
  });
});
