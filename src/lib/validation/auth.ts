import { z } from "zod";

/**
 * Validation schemas dla authentication endpoints.
 *
 * Używane w API endpoints do walidacji request body.
 * Zgodne z wymaganiami z auth-spec.md i PRD.
 */

/**
 * Schema walidacji dla logowania.
 *
 * POST /api/v1/auth/login
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email jest wymagany" })
    .email("Nieprawidłowy format adresu email")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Hasło jest wymagane" })
    .min(8, "Hasło musi mieć minimum 8 znaków"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema walidacji dla rejestracji.
 *
 * POST /api/v1/auth/register
 *
 * Wymagania hasła (z PRD):
 * - Minimum 8 znaków
 * - Zawiera litery (A-Za-z)
 * - Zawiera cyfry (0-9)
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: "Email jest wymagany" })
    .email("Nieprawidłowy format adresu email")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Hasło jest wymagane" })
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/[A-Za-z]/, "Hasło musi zawierać litery")
    .regex(/[0-9]/, "Hasło musi zawierać cyfry"),
  metadata: z
    .object({
      acceptedTermsAt: z.string().datetime().optional(),
    })
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema walidacji dla forgot password.
 *
 * POST /api/v1/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email jest wymagany" })
    .email("Nieprawidłowy format adresu email")
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema walidacji dla reset password.
 *
 * POST /api/v1/auth/reset-password
 *
 * UWAGA: Token pochodzi z URL query param, nie z body.
 * Body zawiera tylko nowe hasło.
 */
export const resetPasswordSchema = z.object({
  newPassword: z
    .string({ required_error: "Nowe hasło jest wymagane" })
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/[A-Za-z]/, "Hasło musi zawierać litery")
    .regex(/[0-9]/, "Hasło musi zawierać cyfry"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
