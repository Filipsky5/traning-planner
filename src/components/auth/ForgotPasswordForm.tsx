import { useState, useCallback, useId } from "react";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

/**
 * Formularz odzyskiwania hasła.
 * Umożliwia użytkownikowi zainicjowanie procesu resetowania hasła
 * poprzez wysłanie linku na podany adres email.
 *
 * TODO: Po implementacji backendu, podłączyć do POST /api/v1/auth/forgot-password
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailId = useId();

  // Walidacja email
  const validateEmail = useCallback((value: string): string | null => {
    if (!value.trim()) {
      return "Adres email jest wymagany";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Nieprawidłowy format adresu email";
    }

    return null;
  }, []);

  // Obsługa zmiany email
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  }, []);

  // Obsługa submitu
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Wyczyść poprzednie błędy
      setError(null);

      // Walidacja email
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      setLoading(true);

      try {
        // Wywołaj POST /api/v1/auth/forgot-password
        const response = await fetch("/api/v1/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // WAŻNE: Wyślij cookies
          body: JSON.stringify({ email }),
        });

        // Parse response
        const data = await response.json();

        if (!response.ok) {
          // Server zwrócił error
          throw new Error(data.error?.message || "Błąd podczas wysyłania emaila");
        }

        // Success - zawsze pokazuj komunikat sukcesu (security best practice)
        setSuccess(true);
      } catch (err) {
        setError("Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [email, validateEmail]
  );

  // Ekran sukcesu
  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Sprawdź swoją skrzynkę email</CardTitle>
          <CardDescription>
            Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">Link resetujący hasło jest ważny przez 1 godzinę.</p>
          <p className="text-sm text-muted-foreground">
            Nie otrzymałeś wiadomości? Sprawdź folder spam lub{" "}
            <button type="button" onClick={() => setSuccess(false)} className="text-primary hover:underline">
              spróbuj ponownie
            </button>
            .
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <a href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do logowania
            </a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Formularz
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Zapomniałeś hasła?</CardTitle>
        <CardDescription>Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Błąd */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Pole Email */}
          <div className="space-y-2">
            <Label htmlFor={emailId}>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id={emailId}
              type="email"
              placeholder="jan.kowalski@example.com"
              value={email}
              onChange={handleEmailChange}
              aria-invalid={!!error}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Wyślij link resetujący
              </>
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <a href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Wróć do logowania
            </a>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
