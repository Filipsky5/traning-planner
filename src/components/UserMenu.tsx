import { User, LogOut, Target } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { PaceUnitToggle } from './PaceUnitToggle';

interface UserMenuProps {
  userEmail: string | null;
}

/**
 * Menu użytkownika wyświetlane w nagłówku aplikacji.
 * Zawiera nazwę użytkownika, link do celu, przełącznik jednostki tempa i przycisk wylogowania.
 *
 * Dane użytkownika (email) są przekazywane przez props z server-side (Astro.locals.user).
 */
export function UserMenu({ userEmail }: UserMenuProps) {

  const handleLogout = async () => {
    try {
      // Wywołaj POST /api/v1/auth/logout
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include', // WAŻNE: Wyślij cookies
      });

      if (!response.ok) {
        console.error('Error signing out:', await response.text());
        // Przekieruj mimo błędu (sesja może być już nieważna)
      }

      // Redirect to login page after logout
      window.location.href = '/login';
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      // Przekieruj mimo błędu
      window.location.href = '/login';
    }
  };

  const handleGoToGoal = () => {
    window.location.href = '/goal';
  };

  // Pierwsze litery email jako inicjały (np. "john.doe@example.com" -> "JD")
  const getInitials = (email: string | null): string => {
    if (!email) return 'U';

    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(userEmail)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Twoje konto</p>
            {userEmail && (
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleGoToGoal} className="cursor-pointer">
          <Target className="mr-2 h-4 w-4" />
          <span>Twój cel</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1">
          <PaceUnitToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Wyloguj</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
