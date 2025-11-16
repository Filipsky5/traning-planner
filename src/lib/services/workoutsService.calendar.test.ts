/**
 * Unit tests for getCalendar service function
 *
 * Tests cover:
 * - Grouping workouts by date
 * - Shape of returned CalendarDto
 * - Error handling from Supabase
 * - Multiple workouts per day (sorting by position)
 * - Multiple days
 * - Empty results
 */

import { describe, it, expect, vi } from "vitest";
import { getCalendar } from "./workoutsService";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper to create mock Supabase client with chainable query methods
 */
function createMockSupabase(data: any[] | null, error: any = null) {
  const queryMock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // Final result
    then: (resolve: any) => resolve({ data, error }),
  };

  return {
    from: () => queryMock,
  } as any as SupabaseClient;
}

describe("getCalendar", () => {
  // ========================================
  // HAPPY PATH - Grupowanie i kształt DTO
  // ========================================

  describe("grouping and shape", () => {
    it("should return empty days array when no workouts in range", async () => {
      const supabase = createMockSupabase([]);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result).toEqual({
        range: {
          start: "2025-01-01",
          end: "2025-01-31",
        },
        days: [],
      });
    });

    it("should handle single workout on single day", async () => {
      const workoutData = [
        {
          id: "w1",
          training_type_code: "easy_run",
          status: "planned",
          position: 1,
          planned_date: "2025-01-10",
        },
      ];

      const supabase = createMockSupabase(workoutData);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result.range).toEqual({
        start: "2025-01-01",
        end: "2025-01-31",
      });
      expect(result.days).toHaveLength(1);
      expect(result.days[0]).toEqual({
        date: "2025-01-10",
        workouts: [
          {
            id: "w1",
            training_type_code: "easy_run",
            status: "planned",
            position: 1,
          },
        ],
      });
    });

    it("should group multiple workouts on same day and preserve order", async () => {
      const workoutData = [
        {
          id: "w1",
          training_type_code: "easy_run",
          status: "planned",
          position: 1,
          planned_date: "2025-01-10",
        },
        {
          id: "w2",
          training_type_code: "tempo_run",
          status: "planned",
          position: 2,
          planned_date: "2025-01-10",
        },
        {
          id: "w3",
          training_type_code: "intervals",
          status: "planned",
          position: 3,
          planned_date: "2025-01-10",
        },
      ];

      const supabase = createMockSupabase(workoutData);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result.days).toHaveLength(1);
      expect(result.days[0].date).toBe("2025-01-10");
      expect(result.days[0].workouts).toHaveLength(3);

      // Sprawdź, że kolejność jest zachowana (zgodnie z position)
      expect(result.days[0].workouts[0].id).toBe("w1");
      expect(result.days[0].workouts[1].id).toBe("w2");
      expect(result.days[0].workouts[2].id).toBe("w3");
    });

    it("should group workouts across multiple days correctly", async () => {
      const workoutData = [
        {
          id: "w1",
          training_type_code: "easy_run",
          status: "planned",
          position: 1,
          planned_date: "2025-01-10",
        },
        {
          id: "w2",
          training_type_code: "tempo_run",
          status: "planned",
          position: 2,
          planned_date: "2025-01-10",
        },
        {
          id: "w3",
          training_type_code: "long_run",
          status: "planned",
          position: 1,
          planned_date: "2025-01-11",
        },
        {
          id: "w4",
          training_type_code: "intervals",
          status: "completed",
          position: 1,
          planned_date: "2025-01-15",
        },
      ];

      const supabase = createMockSupabase(workoutData);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result.days).toHaveLength(3);

      // Dzień 1: 2025-01-10 z 2 treningami
      const day1 = result.days.find((d) => d.date === "2025-01-10");
      expect(day1).toBeDefined();
      expect(day1!.workouts).toHaveLength(2);

      // Dzień 2: 2025-01-11 z 1 treningiem
      const day2 = result.days.find((d) => d.date === "2025-01-11");
      expect(day2).toBeDefined();
      expect(day2!.workouts).toHaveLength(1);

      // Dzień 3: 2025-01-15 z 1 treningiem
      const day3 = result.days.find((d) => d.date === "2025-01-15");
      expect(day3).toBeDefined();
      expect(day3!.workouts).toHaveLength(1);
    });

    it("should preserve different statuses without transformation", async () => {
      const workoutData = [
        {
          id: "w1",
          training_type_code: "easy_run",
          status: "planned",
          position: 1,
          planned_date: "2025-01-10",
        },
        {
          id: "w2",
          training_type_code: "tempo_run",
          status: "completed",
          position: 2,
          planned_date: "2025-01-10",
        },
        {
          id: "w3",
          training_type_code: "intervals",
          status: "skipped",
          position: 3,
          planned_date: "2025-01-10",
        },
        {
          id: "w4",
          training_type_code: "long_run",
          status: "canceled",
          position: 4,
          planned_date: "2025-01-10",
        },
      ];

      const supabase = createMockSupabase(workoutData);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result.days[0].workouts[0].status).toBe("planned");
      expect(result.days[0].workouts[1].status).toBe("completed");
      expect(result.days[0].workouts[2].status).toBe("skipped");
      expect(result.days[0].workouts[3].status).toBe("canceled");
    });

    it("should handle single day range (start === end)", async () => {
      const workoutData = [
        {
          id: "w1",
          training_type_code: "easy_run",
          status: "planned",
          position: 1,
          planned_date: "2025-02-15",
        },
      ];

      const supabase = createMockSupabase(workoutData);

      const result = await getCalendar(supabase, "user-123", "2025-02-15", "2025-02-15");

      expect(result.range).toEqual({
        start: "2025-02-15",
        end: "2025-02-15",
      });
      expect(result.days).toHaveLength(1);
      expect(result.days[0].date).toBe("2025-02-15");
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  describe("error handling", () => {
    it("should throw error when Supabase returns error", async () => {
      const dbError = { message: "Database connection failed", code: "CONN_ERROR" };
      const supabase = createMockSupabase(null, dbError);

      await expect(getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31")).rejects.toEqual(dbError);
    });

    it("should handle null data gracefully when error is null", async () => {
      // Edge case: data=null, error=null (nie powinno się zdarzyć, ale defensywnie)
      const supabase = createMockSupabase(null, null);

      const result = await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(result.days).toEqual([]);
    });
  });

  // ========================================
  // (OPCJONALNIE) Weryfikacja budowy zapytania
  // ========================================

  describe("query building", () => {
    it("should build query with user_id filter and date range", async () => {
      const queryMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };

      const supabase = {
        from: vi.fn(() => queryMock),
      } as any as SupabaseClient;

      await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31");

      expect(supabase.from).toHaveBeenCalledWith("workouts");
      expect(queryMock.select).toHaveBeenCalledWith("id,training_type_code,status,position,planned_date");
      expect(queryMock.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(queryMock.gte).toHaveBeenCalledWith("planned_date", "2025-01-01");
      expect(queryMock.lte).toHaveBeenCalledWith("planned_date", "2025-01-31");
      expect(queryMock.order).toHaveBeenCalledWith("planned_date", { ascending: true });
      expect(queryMock.order).toHaveBeenCalledWith("position", { ascending: true });
    });

    it("should include status filter when status is provided", async () => {
      const queryMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };

      const supabase = {
        from: vi.fn(() => queryMock),
      } as any as SupabaseClient;

      await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31", "planned");

      // eq powinno być wywołane 2 razy: dla user_id i dla status
      expect(queryMock.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(queryMock.eq).toHaveBeenCalledWith("status", "planned");
    });

    it("should NOT include status filter when status is undefined", async () => {
      const queryMock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };

      const supabase = {
        from: vi.fn(() => queryMock),
      } as any as SupabaseClient;

      await getCalendar(supabase, "user-123", "2025-01-01", "2025-01-31", undefined);

      // eq powinno być wywołane tylko raz dla user_id
      expect(queryMock.eq).toHaveBeenCalledTimes(1);
      expect(queryMock.eq).toHaveBeenCalledWith("user_id", "user-123");
    });
  });
});
