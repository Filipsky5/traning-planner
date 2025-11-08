/**
 * Zod validation schemas for User Goal API
 *
 * Walidacja celu użytkownika:
 * - goal_type: tylko "distance_by_date" w MVP
 * - target_distance_m: dystans w metrach (1-1000000)
 * - due_date: data w formacie YYYY-MM-DD (musi być dzisiaj lub w przyszłości)
 * - notes: opcjonalne notatki (max 500 znaków)
 */

import { z } from "zod";

export const userGoalUpsertSchema = z.object({
  goal_type: z.enum(["distance_by_date"]),
  target_distance_m: z.number().int().min(1).max(1000000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    const dueDate = new Date(data.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate >= today;
  },
  { message: "due_date must be today or in the future" }
);

export type UserGoalUpsertInput = z.infer<typeof userGoalUpsertSchema>;
