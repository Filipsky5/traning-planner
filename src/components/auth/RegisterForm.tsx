import { useState, useCallback, useId } from 'react';
import { UserPlus, Loader2, Mail } from 'lucide-react';
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

interface RegisterFormProps {
  redirectTo?: string;
}

type Step = 'form' | 'verification';

/**
 * Formularz rejestracji nowego użytkownika.
 * Zawiera pola email, hasło, potwierdzenie hasła i akceptację regulaminu.
 * Po pomyślnej rejestracji wyświetla komunikat o weryfikacji emaila.
 *
 * TODO: Po implementacji backendu, podłączyć do POST /api/v1/auth/register
 */
export function RegisterForm({ redirectTo = '/onboarding' }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>('form');

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const termsId = useId();

  // Walidacja email
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

  // Walidacja hasła
  const validatePassword = useCallback((value: string): string | null => {
    if (!value) {
      return 'Hasło jest wymagane';
    }

    if (value.length < 8) {
      return 'Hasło musi mieć minimum 8 znaków';
    }

    if (!/[A-Za-z]/.test(value)) {
      return 'Hasło musi zawierać litery';
    }

    if (!/[0-9]/.test(value)) {
      return 'Hasło musi zawierać cyfry';
    }

    return null;
  }, []);

  // Walidacja potwierdzenia hasła
  const validateConfirmPassword = useCallback(
    (value: string): string | null => {
      if (!value) {
        return 'Potwierdzenie hasła jest wymagane';
      }

      if (value !== password) {
        return 'Hasła nie są identyczne';
      }

      return null;
    },
    [password]
  );

  // Walidacja akceptacji regulaminu
  const validateTerms = useCallback((value: boolean): string | null => {
    if (!value) {
      return 'Musisz zaakceptować regulamin';
    }
    return null;
  }, []);

  // Obsługa zmian pól
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (fieldErrors.email) {
        setFieldErrors((prev) => ({ ...prev, email: '' }));
      }
    },
    [fieldErrors.email]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (fieldErrors.password) {
        setFieldErrors((prev) => ({ ...prev, password: '' }));
      }
    },
    [fieldErrors.password]
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
      if (fieldErrors.confirmPassword) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
      }
    },
    [fieldErrors.confirmPassword]
  );

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAcceptTerms(e.target.checked);
      if (fieldErrors.terms) {
        setFieldErrors((prev) => ({ ...prev, terms: '' }));
      }
    },
    [fieldErrors.terms]
  );

  // Obsługa submitu
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Wyczyść poprzednie błędy
      setError(null);
      setFieldErrors({});

      // Walidacja wszystkich pól
      const emailError = validateEmail(email);
      const passwordError = validatePassword(password);
      const confirmPasswordError = validateConfirmPassword(confirmPassword);
      const termsError = validateTerms(acceptTerms);

      if (emailError || passwordError || confirmPasswordError || termsError) {
        setFieldErrors({
          ...(emailError && { email: emailError }),
          ...(passwordError && { password: passwordError }),
          ...(confirmPasswordError && { confirmPassword: confirmPasswordError }),
          ...(termsError && { terms: termsError }),
        });
        return;
      }

      setLoading(true);

      try {
        // Wywołaj POST /api/v1/auth/register
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // WAŻNE: Wyślij cookies
          body: JSON.stringify({
            email,
            password,
            metadata: { acceptedTermsAt: new Date().toISOString() },
          }),
        });

        // Parse response
        const data = await response.json();

        if (!response.ok) {
          // Server zwrócił error
          throw new Error(data.error?.message || 'Błąd rejestracji');
        }

        // Success - przejście do ekranu weryfikacji email
        setStep('verification');
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
    [
      email,
      password,
      confirmPassword,
      acceptTerms,
      redirectTo,
      validateEmail,
      validatePassword,
      validateConfirmPassword,
      validateTerms,
    ]
  );

  // Ekran weryfikacji emaila
  if (step === 'verification') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Sprawdź swoją skrzynkę email</CardTitle>
          <CardDescription>
            Wysłaliśmy wiadomość na adres <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Kliknij link w wiadomości email aby zweryfikować swoje konto i dokończyć
            proces rejestracji.
          </p>
          <p className="text-sm text-muted-foreground">
            Nie otrzymałeś wiadomości? Sprawdź folder spam lub{' '}
            <button
              type="button"
              onClick={() => setStep('form')}
              className="text-primary hover:underline"
            >
              wróć do formularza
            </button>
            .
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <a href="/login">Przejdź do logowania</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Formularz rejestracji
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Utwórz konto</CardTitle>
        <CardDescription>
          Wprowadź swoje dane aby założyć nowe konto
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
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 znaków, litery i cyfry
            </p>
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
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
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Checkbox akceptacji regulaminu */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                id={termsId}
                type="checkbox"
                checked={acceptTerms}
                onChange={handleTermsChange}
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor={termsId} className="text-sm font-normal cursor-pointer">
                Akceptuję{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  regulamin
                </a>{' '}
                i{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  politykę prywatności
                </a>{' '}
                <span className="text-destructive">*</span>
              </Label>
            </div>
            {fieldErrors.terms && (
              <p className="text-sm text-destructive">{fieldErrors.terms}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4" style={{ marginTop: '5px' }}>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tworzenie konta...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Zarejestruj się
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Masz już konto?{' '}
            <a href="/login" className="text-primary hover:underline">
              Zaloguj się
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
