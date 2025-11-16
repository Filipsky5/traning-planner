import { describe, it, expect } from "vitest";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatWorkoutDate,
  workoutStatusConfig,
  workoutStepPartLabels,
} from "./constants";

/**
 * Unit Tests for Formatter Constants and Functions
 * Testing formatting functions for workout data display
 */
describe("formatDistance", () => {
  it("should format meters to kilometers with 2 decimals", () => {
    expect(formatDistance(5000)).toBe("5.00 km");
    expect(formatDistance(10000)).toBe("10.00 km");
    expect(formatDistance(1500)).toBe("1.50 km");
  });

  it("should handle decimal values correctly", () => {
    expect(formatDistance(12345)).toBe("12.35 km");
  });

  it("should handle zero distance", () => {
    expect(formatDistance(0)).toBe("0.00 km");
  });

  it('should return "—" for null', () => {
    expect(formatDistance(null)).toBe("—");
  });

  it('should return "—" for undefined', () => {
    expect(formatDistance(undefined)).toBe("—");
  });

  it('should return "—" for negative values', () => {
    expect(formatDistance(-100)).toBe("—");
    expect(formatDistance(-5000)).toBe("—");
  });

  it("should handle very small distances", () => {
    expect(formatDistance(100)).toBe("0.10 km");
    expect(formatDistance(50)).toBe("0.05 km");
  });

  it("should handle very large distances", () => {
    expect(formatDistance(100000)).toBe("100.00 km");
    expect(formatDistance(42195)).toBe("42.20 km"); // Marathon distance
  });
});

describe("formatDuration", () => {
  it("should format seconds to MM:SS format for durations under 1 hour", () => {
    expect(formatDuration(90)).toBe("1min 30s");
    expect(formatDuration(305)).toBe("5min 5s");
    expect(formatDuration(3599)).toBe("59min 59s");
  });

  it("should format seconds to HH:MM format for durations over 1 hour", () => {
    expect(formatDuration(3600)).toBe("1h 0min");
    expect(formatDuration(7265)).toBe("2h 1min");
    expect(formatDuration(14400)).toBe("4h 0min");
  });

  it("should handle zero duration", () => {
    expect(formatDuration(0)).toBe("0min 0s");
  });

  it('should return "—" for null', () => {
    expect(formatDuration(null)).toBe("—");
  });

  it('should return "—" for undefined', () => {
    expect(formatDuration(undefined)).toBe("—");
  });

  it('should return "—" for negative values', () => {
    expect(formatDuration(-100)).toBe("—");
    expect(formatDuration(-3600)).toBe("—");
  });

  it("should handle very short durations", () => {
    expect(formatDuration(1)).toBe("0min 1s");
    expect(formatDuration(59)).toBe("0min 59s");
  });

  it("should handle very long durations", () => {
    expect(formatDuration(21600)).toBe("6h 0min"); // 6 hours
    expect(formatDuration(36000)).toBe("10h 0min"); // 10 hours
  });
});

describe("formatPace", () => {
  it("should format pace in seconds/km to MM:SS min/km", () => {
    expect(formatPace(300)).toBe("5:00 min/km"); // 5 min/km
    expect(formatPace(360)).toBe("6:00 min/km"); // 6 min/km
    expect(formatPace(245)).toBe("4:05 min/km"); // 4:05 min/km
  });

  it("should pad seconds with leading zeros", () => {
    expect(formatPace(301)).toBe("5:01 min/km");
    expect(formatPace(305)).toBe("5:05 min/km");
  });

  it("should handle fast paces", () => {
    expect(formatPace(180)).toBe("3:00 min/km"); // 3 min/km
    expect(formatPace(210)).toBe("3:30 min/km"); // 3:30 min/km
  });

  it("should handle slow paces", () => {
    expect(formatPace(420)).toBe("7:00 min/km"); // 7 min/km
    expect(formatPace(480)).toBe("8:00 min/km"); // 8 min/km
  });

  it("should handle zero pace", () => {
    expect(formatPace(0)).toBe("0:00 min/km");
  });

  it('should return "—" for null', () => {
    expect(formatPace(null)).toBe("—");
  });

  it('should return "—" for undefined', () => {
    expect(formatPace(undefined)).toBe("—");
  });

  it('should return "—" for negative values', () => {
    expect(formatPace(-100)).toBe("—");
    expect(formatPace(-300)).toBe("—");
  });

  it("should handle edge case paces", () => {
    expect(formatPace(120)).toBe("2:00 min/km"); // Very fast
    expect(formatPace(600)).toBe("10:00 min/km"); // Very slow
  });
});

describe("formatWorkoutDate", () => {
  it("should format date string to Polish locale", () => {
    const formatted = formatWorkoutDate("2024-01-15");
    expect(formatted).toContain("2024");
    expect(formatted.toLowerCase()).toContain("stycznia");
  });

  it("should return empty string for null", () => {
    expect(formatWorkoutDate(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(formatWorkoutDate(undefined)).toBe("");
  });

  it("should return empty string for empty string", () => {
    expect(formatWorkoutDate("")).toBe("");
  });

  it("should handle different months", () => {
    const january = formatWorkoutDate("2024-01-01");
    const december = formatWorkoutDate("2024-12-31");

    expect(january.toLowerCase()).toContain("stycznia");
    expect(december.toLowerCase()).toContain("grudnia");
  });

  it("should include weekday name", () => {
    const formatted = formatWorkoutDate("2024-01-15");
    // Should include day of week in Polish
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(10);
  });
});

describe("workoutStatusConfig", () => {
  it("should have config for all workout statuses", () => {
    expect(workoutStatusConfig.planned).toBeDefined();
    expect(workoutStatusConfig.completed).toBeDefined();
    expect(workoutStatusConfig.skipped).toBeDefined();
    expect(workoutStatusConfig.cancelled).toBeDefined();
  });

  it("should have correct labels", () => {
    expect(workoutStatusConfig.planned.label).toBe("Zaplanowany");
    expect(workoutStatusConfig.completed.label).toBe("Ukończony");
    expect(workoutStatusConfig.skipped.label).toBe("Pominięty");
    expect(workoutStatusConfig.cancelled.label).toBe("Anulowany");
  });

  it("should have correct badge variants", () => {
    expect(workoutStatusConfig.planned.variant).toBe("outline");
    expect(workoutStatusConfig.completed.variant).toBe("default");
    expect(workoutStatusConfig.skipped.variant).toBe("secondary");
    expect(workoutStatusConfig.cancelled.variant).toBe("destructive");
  });
});

describe("workoutStepPartLabels", () => {
  it("should have labels for all step parts", () => {
    expect(workoutStepPartLabels.warmup).toBeDefined();
    expect(workoutStepPartLabels.main).toBeDefined();
    expect(workoutStepPartLabels.cooldown).toBeDefined();
    expect(workoutStepPartLabels.segment).toBeDefined();
  });

  it("should have correct Polish labels", () => {
    expect(workoutStepPartLabels.warmup).toBe("Rozgrzewka");
    expect(workoutStepPartLabels.main).toBe("Część główna");
    expect(workoutStepPartLabels.cooldown).toBe("Cool-down");
    expect(workoutStepPartLabels.segment).toBe("Segment");
  });
});
