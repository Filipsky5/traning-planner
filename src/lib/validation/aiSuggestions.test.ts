import { describe, expect, it } from "vitest";
import { acceptBodySchema, createBodySchema, eventsQuerySchema, listQuerySchema } from "./aiSuggestions";

describe("AI suggestion API validation after the Zod 4 migration", () => {
  it("keeps pagination defaults when query parameters are absent", () => {
    expect(listQuerySchema.parse({})).toEqual({ page: 1, per_page: 20, sort: "created_at:desc" });
    expect(eventsQuerySchema.parse({})).toEqual({ page: 1, per_page: 20 });
  });

  it("converts numeric query strings and rejects invalid pagination", () => {
    expect(eventsQuerySchema.parse({ page: "2", per_page: "10" })).toEqual({ page: 2, per_page: 10 });
    expect(eventsQuerySchema.safeParse({ page: "abc" }).success).toBe(false);
    expect(eventsQuerySchema.safeParse({ per_page: "101" }).success).toBe(false);
  });

  it("accepts arbitrary context values in a string-keyed record", () => {
    const input = {
      planned_date: "2026-11-08",
      training_type_code: "easy",
      context: { note: "Recovery run", recentWorkouts: [{ distance: 5000 }], calibration: true },
    };

    expect(createBodySchema.parse(input)).toEqual(input);
  });

  it("preserves the missing position error and validates supplied positions", () => {
    const result = acceptBodySchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("position is required");
    }
    expect(acceptBodySchema.parse({ position: "2" })).toEqual({ position: 2 });
    expect(acceptBodySchema.safeParse({ position: 0 }).success).toBe(false);
  });
});
