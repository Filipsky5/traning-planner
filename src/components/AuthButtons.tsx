import { LogIn, UserPlus } from "lucide-react";
import { Button } from "./ui/button";

/**
 * Przyciski autentykacji dla niezalogowanych użytkowników.
 * Wyświetlane w Header.astro gdy user nie jest zalogowany.
 *
 * Zawiera:
 * - Link do logowania (/login)
 * - Link do rejestracji (/register)
 */
export function AuthButtons() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <a href="/login">
          <LogIn className="h-4 w-4 mr-2" />
          Zaloguj się
        </a>
      </Button>
      <Button asChild variant="default" size="sm">
        <a href="/register">
          <UserPlus className="h-4 w-4 mr-2" />
          Zarejestruj się
        </a>
      </Button>
    </div>
  );
}
