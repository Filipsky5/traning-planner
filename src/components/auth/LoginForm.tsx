import { useState, useCallback, useId } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

interface LoginFormProps {
  redirectTo?: string;
}

/**
 * Formularz logowania użytkownika.
 * Zawiera pola email i hasło z walidacją client-side.
 *
 * TODO: Po implementacji backendu, podłączyć do POST /api/v1/auth/login
 */
export function LoginForm({ redirectTo = '/' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const emailId = useId();
  const passwordId = useId();

  // Walidacja pola email
  const validateEmail = useCallback((value: string): string | null => {
    if (!value.trim()) {
      return 'Adres email jest wymagany';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Nieprawidłowy format adresu email';
    }

    return null;
  }, []);

  // Walidacja pola hasło
  const validatePassword = useCallback((value: string): string | null => {
    if (!value) {
      return 'Hasło jest wymagane';
    }

    if (value.length < 8) {
      return 'Hasło musi mieć minimum 8 znaków';
    }

    return null;
  }, []);

  // Obsługa zmiany email z walidacją
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);

      // Wyczyść błąd pola podczas wpisywania
      if (fieldErrors.email) {
        setFieldErrors((prev) => ({ ...prev, email: '' }));
      }
    },
    [fieldErrors.email]
  );

  // Obsługa zmiany hasła z walidacją
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPassword(value);

      // Wyczyść błąd pola podczas wpisywania
      if (fieldErrors.password) {
        setFieldErrors((prev) => ({ ...prev, password: '' }));
      }
    },
    [fieldErrors.password]
  );

  // Obsługa submitu formularza
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Wyczyść poprzednie błędy
      setError(null);
      setFieldErrors({});

      // Walidacja wszystkich pól
      const emailError = validateEmail(email);
      const passwordError = validatePassword(password);

      if (emailError || passwordError) {
        setFieldErrors({
          ...(emailError && { email: emailError }),
          ...(passwordError && { password: passwordError }),
        });
        return;
      }

      // Symulacja wywołania API
      setLoading(true);

      try {
        // TODO: Wywołaj POST /api/v1/auth/login
        // const response = await fetch('/api/v1/auth/login', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ email, password }),
        // });

        // if (!response.ok) {
        //   const data = await response.json();
        //   throw new Error(data.error?.message || 'Błąd logowania');
        // }

        // const data = await response.json();
        // Zapisz token i przekieruj
        // window.location.href = redirectTo;

        // Placeholder: symulacja sukcesu po 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log('Login attempt:', { email, redirectTo });
        alert('Formularz logowania działa! Backend będzie dodany w następnym kroku.');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password, redirectTo, validateEmail, validatePassword]
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>
          Wprowadź swoje dane aby uzyskać dostęp do aplikacji
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Globalny błąd */}
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
              aria-invalid={!!fieldErrors.email}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          {/* Pole Hasło */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>
              Hasło <span className="text-destructive">*</span>
            </Label>
            <Input
              id={passwordId}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={handlePasswordChange}
              aria-invalid={!!fieldErrors.password}
              disabled={loading}
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          {/* Link do odzyskiwania hasła */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Zapomniałeś hasła?
            </a>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Zaloguj się
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Nie masz konta?{' '}
            <a href="/register" className="text-primary hover:underline">
              Zarejestruj się
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
