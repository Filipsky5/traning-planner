/**
 * Zod validation schemas for Workouts API
 *
 * Analogia do iOS: Podobne do Codable validation w Swift
 * - Zod = runtime type checking + validation (TypeScript sam nie waliduje w runtime)
 * - .parse() rzuca błąd jeśli walidacja nie przejdzie (analogia do try/catch w Swift)
 * - .transform() = custom parsing logic (jak computed properties w Codable)
 * - .refine() = custom validation rules (jak validateValue w Swift)
 */

import { z } from "zod";

// Helper schema for workout steps (warm-up, main, cool-down, etc.)
// Każdy step musi mieć distance_m LUB duration_s (anyOf logic)
const stepSchema = z
  .object({
    part: z.enum(["warmup", "main", "cooldown", "segment"]),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(60).max(21600).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.distance_m !== undefined || data.duration_s !== undefined, {
    message: "At least one of distance_m or duration_s is required",
  });

// GET /api/v1/workouts - list query parameters
export const listQuerySchema = z.object({
  // Filters
  status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  // training_type_code: comma-separated values → transform to array
  training_type_code: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((s) => s.trim()) : undefined)),
  origin: z.enum(["manual", "ai", "import"]).optional(),
  rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),

  // Date range filters
  planned_date_gte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  planned_date_lte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  completed_at_gte: z.string().datetime().optional(),
  completed_at_lte: z.string().datetime().optional(),

  // Sorting and pagination
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// POST /api/v1/workouts - create workout (planned or completed)
// Conditional validation: jeśli status=completed, wymaga metryk realizacji
export const createWorkoutSchema = z
  .object({
    // Basic fields (zawsze wymagane)
    training_type_code: z.string().min(1).max(50),
    planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    position: z.number().int().min(1),
    planned_distance_m: z.number().int().min(100).max(100000),
    planned_duration_s: z.number().int().min(300).max(21600),
    steps: z.array(stepSchema).min(1),

    // Optional fields (dla completed workout)
    status: z.enum(["planned", "completed"]).optional(),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(300).max(21600).optional(),
    avg_hr_bpm: z.number().int().min(0).max(240).optional(),
    completed_at: z.string().datetime().optional(),
    rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  })
  .refine(
    (data) => {
      // Guard: jeśli status=completed, wszystkie metryki wymagane
      if (data.status === "completed") {
        return (
          data.distance_m !== undefined &&
          data.duration_s !== undefined &&
          data.avg_hr_bpm !== undefined &&
          data.completed_at !== undefined
        );
      }
      return true;
    },
    { message: "Completed workouts require distance_m, duration_s, avg_hr_bpm, and completed_at" }
  );

// PATCH /api/v1/workouts/[id] - update workout (partial)
// Strict mode: odrzuca nieznane pola (zapobiega zmianie immutable fields)
export const updateWorkoutSchema = z
  .object({
    planned_distance_m: z.number().int().min(100).max(100000).optional(),
    planned_duration_s: z.number().int().min(300).max(21600).optional(),
    steps: z.array(stepSchema).min(1).optional(),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(300).max(21600).optional(),
    avg_hr_bpm: z.number().int().min(0).max(240).optional(),
    completed_at: z.string().datetime().optional(),
    rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
    status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  })
  .strict(); // Strict mode - reject unknown fields (prevents immutable field changes)

// POST /api/v1/workouts/[id]/complete - complete workout
export const completeWorkoutSchema = z.object({
  distance_m: z.number().int().min(100).max(100000),
  duration_s: z.number().int().min(300).max(21600),
  avg_hr_bpm: z.number().int().min(0).max(240),
  completed_at: z.string().datetime(),
  rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
});

// POST /api/v1/workouts/[id]/rate - rate workout
export const rateWorkoutSchema = z.object({
  rating: z.enum(["too_easy", "just_right", "too_hard"]),
});

// GET /api/v1/workouts/last3 - last 3 completed workouts
export const last3QuerySchema = z.object({
  training_type_code: z.string().optional(),
});

// GET /api/v1/calendar - calendar view
export const calendarQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  })
  .refine((data) => new Date(data.end) >= new Date(data.start), { message: "End date must be >= start date" });

// Export inferred types for use in endpoints
export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;
export type RateWorkoutInput = z.infer<typeof rateWorkoutSchema>;
export type Last3Query = z.infer<typeof last3QuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
