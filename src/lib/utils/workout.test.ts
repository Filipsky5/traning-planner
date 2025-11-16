import { describe, it, expect } from "vitest";
import { getColorForTrainingType, formatDistance, formatDuration, formatPace } from "./workout";

/**
 * Unit Tests for Workout Utility Functions
 * Testing formatting and mapping functions for workout data display
 */
describe("workout utilities", () => {
  describe("getColorForTrainingType", () => {
    it("should return correct color for easy_run", () => {
      expect(getColorForTrainingType("easy_run")).toBe("bg-blue-500");
    });

    it("should return correct color for tempo_run", () => {
      expect(getColorForTrainingType("tempo_run")).toBe("bg-orange-500");
    });

    it("should return correct color for interval", () => {
      expect(getColorForTrainingType("interval")).toBe("bg-red-500");
    });

    it("should return correct color for long_run", () => {
      expect(getColorForTrainingType("long_run")).toBe("bg-purple-500");
    });

    it("should return correct color for recovery", () => {
      expect(getColorForTrainingType("recovery")).toBe("bg-green-500");
    });

    it("should return default gray color for unknown type", () => {
      expect(getColorForTrainingType("unknown_type")).toBe("bg-gray-500");
    });
  });

  describe("formatDistance", () => {
    it("should format meters to kilometers with 2 decimals", () => {
      expect(formatDistance(5000)).toBe("5.00 km");
      expect(formatDistance(10000)).toBe("10.00 km");
      expect(formatDistance(1500)).toBe("1.50 km");
    });

    it("should handle decimal values correctly", () => {
      expect(formatDistance(12345)).toBe("12.35 km");
    });

    it("should return empty string for null", () => {
      expect(formatDistance(null)).toBe("");
    });

    it("should return empty string for zero", () => {
      expect(formatDistance(0)).toBe("");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds to MM:SS for durations under 1 hour", () => {
      expect(formatDuration(90)).toBe("1:30");
      expect(formatDuration(305)).toBe("5:05");
      expect(formatDuration(3599)).toBe("59:59");
    });

    it("should format seconds to HH:MM:SS for durations over 1 hour", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
      expect(formatDuration(7265)).toBe("2:01:05");
      expect(formatDuration(14400)).toBe("4:00:00");
    });

    it("should pad minutes and seconds with leading zeros", () => {
      expect(formatDuration(65)).toBe("1:05");
      expect(formatDuration(3665)).toBe("1:01:05");
    });

    it("should return empty string for null", () => {
      expect(formatDuration(null)).toBe("");
    });

    it("should return empty string for zero", () => {
      expect(formatDuration(0)).toBe("");
    });
  });

  describe("formatPace", () => {
    it("should format pace in seconds/km to MM:SS/km", () => {
      expect(formatPace(300)).toBe("5:00/km"); // 5 min/km
      expect(formatPace(360)).toBe("6:00/km"); // 6 min/km
      expect(formatPace(245)).toBe("4:05/km"); // 4:05 min/km
    });

    it("should pad seconds with leading zeros", () => {
      expect(formatPace(301)).toBe("5:01/km");
      expect(formatPace(305)).toBe("5:05/km");
    });

    it("should handle fast paces", () => {
      expect(formatPace(180)).toBe("3:00/km"); // 3 min/km
      expect(formatPace(210)).toBe("3:30/km"); // 3:30 min/km
    });

    it("should handle slow paces", () => {
      expect(formatPace(420)).toBe("7:00/km"); // 7 min/km
      expect(formatPace(480)).toBe("8:00/km"); // 8 min/km
    });

    it("should return empty string for null", () => {
      expect(formatPace(null)).toBe("");
    });

    it("should return empty string for zero", () => {
      expect(formatPace(0)).toBe("");
    });
  });
});
