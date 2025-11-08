import { z } from "zod";

/**
 * Schema walidacji parametrów query dla endpoint'a GET /api/v1/training-types
 *
 * @property include_inactive - Określa czy zwracać także nieaktywne typy treningów.
 *                              Akceptuje wartości: true, false, "true", "false"
 *                              Wymaga autoryzacji (X-Internal-Token) gdy ustawione na true.
 */
export const listQuerySchema = z.object({
  include_inactive: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => (typeof v === "string" ? v.toLowerCase() : v))
    .transform((v) => (v === "true" || v === true ? true : false)),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
