/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for GET /api/v1/calendar handler
 *
 * Tests cover:
 * - 401 Unauthorized (missing user)
 * - 422 Validation Error (invalid query params)
 * - 200 OK (happy path with and without status)
 * - 500 Internal Server Error (service throws)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./calendar";
import * as workoutsService from "../../../lib/services/workoutsService";
import type { APIContext } from "astro";
import type { CalendarDto } from "../../../types";

/**
 * Helper to create mock APIContext
 */
function createMockContext(queryParams: Record<string, string>, user?: { id: string }, supabase?: any): APIContext {
  const url = new URL("http://localhost/api/v1/calendar");
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    request: new Request(url.toString()),
    locals: {
      user,
      supabase: supabase ?? {},
    },
  } as unknown as APIContext;
}

/**
 * Helper to parse JSON response
 */
async function parseResponse(response: Response) {
  const text = await response.text();
  return JSON.parse(text);
}

describe("GET /api/v1/calendar", () => {
  let getCalendarSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getCalendarSpy = vi.spyOn(workoutsService, "getCalendar");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================
  // 401 UNAUTHORIZED
  // ========================================

  describe("401 - unauthorized", () => {
    it("should return 401 when user is missing from context.locals", async () => {
      const context = createMockContext(
        { start: "2025-01-01", end: "2025-01-31" },
        undefined // no user
      );

      const response = await GET(context);

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await parseResponse(response);
      expect(body).toEqual({
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      });

      // getCalendar nie powinno być wywołane
      expect(getCalendarSpy).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 422 VALIDATION ERROR
  // ========================================

  describe("422 - validation error", () => {
    it("should return 422 when end < start", async () => {
      const context = createMockContext({ start: "2025-02-10", end: "2025-02-01" }, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");
      expect(body.error.message).toBe("Invalid query parameters");
      expect(body.error.details).toBeDefined();
      expect(Array.isArray(body.error.details)).toBe(true);

      // getCalendar nie powinno być wywołane
      expect(getCalendarSpy).not.toHaveBeenCalled();
    });

    it("should return 422 when start is missing", async () => {
      const context = createMockContext({ end: "2025-01-31" }, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");
      expect(body.error.details).toBeDefined();

      expect(getCalendarSpy).not.toHaveBeenCalled();
    });

    it("should return 422 when end is missing", async () => {
      const context = createMockContext({ start: "2025-01-01" }, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");

      expect(getCalendarSpy).not.toHaveBeenCalled();
    });

    it("should return 422 when both start and end are missing", async () => {
      const context = createMockContext({}, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");

      expect(getCalendarSpy).not.toHaveBeenCalled();
    });

    it("should return 422 when date format is invalid (slash separator)", async () => {
      const context = createMockContext({ start: "2025/01/01", end: "2025/01/31" }, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");

      expect(getCalendarSpy).not.toHaveBeenCalled();
    });

    it("should return 422 when status is invalid", async () => {
      const context = createMockContext(
        { start: "2025-01-01", end: "2025-01-31", status: "archived" },
        { id: "user-123" }
      );

      const response = await GET(context);

      expect(response.status).toBe(422);

      const body = await parseResponse(response);
      expect(body.error.code).toBe("validation_error");

      expect(getCalendarSpy).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 200 OK - HAPPY PATH
  // ========================================

  describe("200 - success", () => {
    it("should return 200 with calendar data when params are valid (no status)", async () => {
      const mockCalendarDto: CalendarDto = {
        range: {
          start: "2025-01-01",
          end: "2025-01-31",
        },
        days: [
          {
            date: "2025-01-10",
            workouts: [
              {
                id: "w1",
                training_type_code: "easy_run",
                status: "planned",
                position: 1,
              },
            ],
          },
        ],
      };

      getCalendarSpy.mockResolvedValue(mockCalendarDto);

      const mockSupabase = {};
      const context = createMockContext({ start: "2025-01-01", end: "2025-01-31" }, { id: "user-123" }, mockSupabase);

      const response = await GET(context);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const body = await parseResponse(response);
      expect(body).toEqual({
        data: mockCalendarDto,
      });

      // Sprawdź, że getCalendar zostało wywołane z poprawnymi parametrami
      expect(getCalendarSpy).toHaveBeenCalledTimes(1);
      expect(getCalendarSpy).toHaveBeenCalledWith(
        mockSupabase,
        "user-123",
        "2025-01-01",
        "2025-01-31",
        undefined // no status
      );
    });

    it("should return 200 with calendar data when status is provided", async () => {
      const mockCalendarDto: CalendarDto = {
        range: {
          start: "2025-01-01",
          end: "2025-01-31",
        },
        days: [
          {
            date: "2025-01-10",
            workouts: [
              {
                id: "w1",
                training_type_code: "easy_run",
                status: "planned",
                position: 1,
              },
            ],
          },
        ],
      };

      getCalendarSpy.mockResolvedValue(mockCalendarDto);

      const mockSupabase = {};
      const context = createMockContext(
        { start: "2025-01-01", end: "2025-01-31", status: "planned" },
        { id: "user-123" },
        mockSupabase
      );

      const response = await GET(context);

      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.data).toEqual(mockCalendarDto);

      // Sprawdź, że getCalendar zostało wywołane ze statusem
      expect(getCalendarSpy).toHaveBeenCalledTimes(1);
      expect(getCalendarSpy).toHaveBeenCalledWith(mockSupabase, "user-123", "2025-01-01", "2025-01-31", "planned");
    });

    it("should return 200 with empty days when no workouts exist", async () => {
      const mockCalendarDto: CalendarDto = {
        range: {
          start: "2025-01-01",
          end: "2025-01-31",
        },
        days: [],
      };

      getCalendarSpy.mockResolvedValue(mockCalendarDto);

      const mockSupabase = {};
      const context = createMockContext({ start: "2025-01-01", end: "2025-01-31" }, { id: "user-123" }, mockSupabase);

      const response = await GET(context);

      expect(response.status).toBe(200);

      const body = await parseResponse(response);
      expect(body.data.days).toEqual([]);
    });
  });

  // ========================================
  // 500 INTERNAL SERVER ERROR
  // ========================================

  describe("500 - internal server error", () => {
    it("should return 500 when getCalendar throws unexpected error", async () => {
      const dbError = new Error("Database connection failed");
      getCalendarSpy.mockRejectedValue(dbError);

      const context = createMockContext({ start: "2025-01-01", end: "2025-01-31" }, { id: "user-123" });

      const response = await GET(context);

      expect(response.status).toBe(500);

      const body = await parseResponse(response);
      expect(body).toEqual({
        error: {
          code: "internal_error",
          message: "Unexpected server error",
        },
      });
    });
  });
});
