import { useState, useCallback, useId } from "react";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface ResetPasswordFormProps {
  token: string;
}

/**
 * Formularz resetowania hasła.
 * Umożliwia użytkownikowi ustawienie nowego hasła po kliknięciu
 * linku resetującego otrzymanego w wiadomości email.
 *
 * TODO: Po implementacji backendu, podłączyć do POST /api/v1/auth/reset-password
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const newPasswordId = useId();
  const confirmPasswordId = useId();

  // Walidacja nowego hasła
  const validatePassword = useCallback((value: string): string | null => {
    if (!value) {
      return "Hasło jest wymagane";
    }

    if (value.length < 8) {
      return "Hasło musi mieć minimum 8 znaków";
    }

    if (!/[A-Za-z]/.test(value)) {
      return "Hasło musi zawierać litery";
    }

    if (!/[0-9]/.test(value)) {
      return "Hasło musi zawierać cyfry";
    }

    return null;
  }, []);

  // Walidacja potwierdzenia hasła
  const validateConfirmPassword = useCallback(
    (value: string): string | null => {
      if (!value) {
        return "Potwierdzenie hasła jest wymagane";
      }

      if (value !== newPassword) {
        return "Hasła nie są identyczne";
      }

      return null;
    },
    [newPassword]
  );

  // Obsługa zmian pól
  const handleNewPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewPassword(e.target.value);
      if (fieldErrors.newPassword) {
        setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
      }
    },
    [fieldErrors.newPassword]
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
      if (fieldErrors.confirmPassword) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    },
    [fieldErrors.confirmPassword]
  );

  // Obsługa submitu
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Wyczyść poprzednie błędy
      setError(null);
      setFieldErrors({});

      // Walidacja pól
      const passwordError = validatePassword(newPassword);
      const confirmPasswordError = validateConfirmPassword(confirmPassword);

      if (passwordError || confirmPasswordError) {
        setFieldErrors({
          ...(passwordError && { newPassword: passwordError }),
          ...(confirmPasswordError && { confirmPassword: confirmPasswordError }),
        });
        return;
      }

      setLoading(true);

      try {
        // Wywołaj POST /api/v1/auth/reset-password
        // UWAGA: Token nie jest przekazywany w body - pochodzi z cookies (ustawiony przez Supabase)
        const response = await fetch("/api/v1/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // WAŻNE: Wyślij cookies z tokenem
          body: JSON.stringify({ newPassword }),
        });

        // Parse response
        const data = await response.json();

        if (!response.ok) {
          // Server zwrócił error
          throw new Error(data.error?.message || "Błąd resetowania hasła");
        }

        // Success - user jest teraz zalogowany
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },

    [newPassword, confirmPassword, validatePassword, validateConfirmPassword]
  );

  // Ekran sukcesu
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Hasło zostało zmienione</CardTitle>
          <CardDescription>Twoje hasło zostało pomyślnie zaktualizowane</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">Możesz teraz zalogować się używając nowego hasła.</p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <a href="/login">Przejdź do logowania</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Formularz resetowania hasła
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
        <CardDescription>Wprowadź nowe hasło dla swojego konta</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Globalny błąd */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Pole Nowe hasło */}
          <div className="space-y-2">
            <Label htmlFor={newPasswordId}>
              Nowe hasło <span className="text-destructive">*</span>
            </Label>
            <Input
              id={newPasswordId}
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={handleNewPasswordChange}
              aria-invalid={!!fieldErrors.newPassword}
              disabled={loading}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Minimum 8 znaków, litery i cyfry</p>
            {fieldErrors.newPassword && <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>}
          </div>

          {/* Pole Potwierdzenie hasła */}
          <div className="space-y-2">
            <Label htmlFor={confirmPasswordId}>
              Potwierdzenie hasła <span className="text-destructive">*</span>
            </Label>
            <Input
              id={confirmPasswordId}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              aria-invalid={!!fieldErrors.confirmPassword}
              disabled={loading}
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetowanie hasła...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Zresetuj hasło
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            <a href="/login" className="text-primary hover:underline">
              Wróć do logowania
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
