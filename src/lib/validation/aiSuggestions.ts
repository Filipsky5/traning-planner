import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SORTABLE_FIELDS = ["created_at", "planned_date", "status"] as const;

export const listQuerySchema = z
  .object({
    status: z.enum(["shown", "accepted", "rejected", "expired"]).optional(),
    created_after: z
      .string()
      .regex(ISO_DATE_REGEX, "created_after must be in YYYY-MM-DD format")
      .optional(),
    created_before: z
      .string()
      .regex(ISO_DATE_REGEX, "created_before must be in YYYY-MM-DD format")
      .optional(),
    page: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value === undefined ? undefined : Number(value)))
      .pipe(
        z
          .number({
            invalid_type_error: "page must be a number",
          })
          .int("page must be an integer")
          .min(1, "page must be >= 1")
      )
      .default(1),
    per_page: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => (value === undefined ? undefined : Number(value)))
      .pipe(
        z
          .number({
            invalid_type_error: "per_page must be a number",
          })
          .int("per_page must be an integer")
          .min(1, "per_page must be >= 1")
          .max(100, "per_page must be <= 100")
      )
      .default(20),
    sort: z
      .string()
      .optional()
      .transform((value) => (value ? value.toLowerCase() : "created_at:desc"))
      .superRefine((value, ctx) => {
        const [field, direction] = value.split(":");
        if (!SORTABLE_FIELDS.includes(field as (typeof SORTABLE_FIELDS)[number])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sort"],
            message: `sort field must be one of ${SORTABLE_FIELDS.join(", ")}`,
          });
        }
        if (!["asc", "desc"].includes(direction)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sort"],
            message: "sort direction must be asc or desc",
          });
        }
      }),
  })
  .superRefine((value, ctx) => {
    if (value.created_after && value.created_before && value.created_after > value.created_before) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["created_after"],
        message: "created_after must be earlier or equal to created_before",
      });
    }
  });

export type ListQueryParams = z.infer<typeof listQuerySchema>;

export const createBodySchema = z.object({
  planned_date: z
    .string({
      required_error: "planned_date is required",
    })
    .regex(ISO_DATE_REGEX, "planned_date must be in YYYY-MM-DD format"),
  training_type_code: z
    .string({
      required_error: "training_type_code is required",
    })
    .min(1, "training_type_code cannot be empty"),
  context: z.record(z.unknown()).optional(),
});

export type CreateBody = z.infer<typeof createBodySchema>;

export const detailQuerySchema = z.object({
  include_expired: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      if (value === undefined) return false;
      return value.toLowerCase() === "true";
    }),
});

export type DetailQueryParams = z.infer<typeof detailQuerySchema>;

export const acceptBodySchema = z.object({
  position: z
    .union([z.string(), z.number()], {
      required_error: "position is required",
      invalid_type_error: "position must be a number",
    })
    .transform((value) => Number(value))
    .pipe(
      z
        .number()
        .int("position must be an integer")
        .min(1, "position must be >= 1")
    ),
});

export type AcceptBody = z.infer<typeof acceptBodySchema>;

export const regenerateBodySchema = z.object({
  reason: z
    .string({
      invalid_type_error: "reason must be a string",
    })
    .trim()
    .min(1, "reason cannot be empty")
    .max(500, "reason must not exceed 500 characters")
    .optional(),
  adjustment_hint: z
    .string({
      invalid_type_error: "adjustment_hint must be a string",
    })
    .trim()
    .min(1, "adjustment_hint cannot be empty")
    .max(500, "adjustment_hint must not exceed 500 characters")
    .optional(),
});

export type RegenerateBody = z.infer<typeof regenerateBodySchema>;

