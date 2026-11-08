import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./auth";

describe("authentication validation after the Zod 4 migration", () => {
  it.each([loginSchema, registerSchema, forgotPasswordSchema])("preserves the required email message", (schema) => {
    const result = schema.safeParse({ password: "Runner123" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["email"], message: "Email jest wymagany" })
      );
    }
  });

  it("normalizes valid login emails", () => {
    expect(loginSchema.parse({ email: "RUNNER@example.com", password: "Runner123" }).email).toBe("runner@example.com");
  });

  it("reports malformed emails through the issues API", () => {
    const result = loginSchema.safeParse({ email: "invalid", password: "Runner123" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nieprawidłowy format adresu email");
    }
  });

  it("continues rejecting registration and reset passwords without digits", () => {
    expect(registerSchema.safeParse({ email: "runner@example.com", password: "OnlyLetters" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ newPassword: "OnlyLetters" }).success).toBe(false);
  });
});
