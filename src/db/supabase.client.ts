import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClient = SupabaseJsClient<Database>;

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Client-side Supabase client.
 * Używany w komponentach React do operacji browser-side.
 *
 * UWAGA: Ten client będzie wkrótce używany tylko do odczytu public data.
 * Autentykacja będzie zarządzana przez server-side cookies.
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Cookie options dla Supabase Auth.
 * Zgodnie z best practices bezpieczeństwa.
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true, // HTTPS only
  httpOnly: true, // Nie dostępne dla JavaScript (XSS protection)
  sameSite: "lax", // CSRF protection
};

/**
 * Parsuje Cookie header na tablicę obiektów { name, value }.
 *
 * @param cookieHeader - Raw Cookie header string (format: "name1=value1; name2=value2")
 * @returns Array of cookie objects
 *
 * @example
 * parseCookieHeader("sb-access-token=xyz; sb-refresh-token=abc")
 * // => [{ name: "sb-access-token", value: "xyz" }, { name: "sb-refresh-token", value: "abc" }]
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Tworzy server-side Supabase client z obsługą cookies.
 *
 * WAŻNE: Używa TYLKO getAll/setAll pattern (zgodnie z @supabase/ssr docs).
 * NIE używaj get/set/remove - to może powodować race conditions.
 *
 * Pattern cookies-based authentication:
 * 1. Request zawiera Cookie header z tokenami Supabase
 * 2. getAll() parsuje cookies z headera
 * 3. Supabase SDK używa cookies do autentykacji
 * 4. setAll() zapisuje nowe/zaktualizowane cookies w response
 *
 * @param context - Astro context z headers i cookies
 * @returns Supabase server client z auth context z cookies
 *
 * Analogia do iOS:
 * - Jak URLSession.shared z custom configuration + cookie storage
 * - Każde request ma własny auth context (podobnie jak URLRequest z headers)
 *
 * @example
 * // W middleware:
 * const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
 * const { data: { user } } = await supabase.auth.getUser();
 *
 * // W API endpoint:
 * export async function POST({ request, cookies }: APIContext) {
 *   const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 * }
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      /**
       * getAll() - Pobiera wszystkie cookies z request headers.
       * Wywoływane przez Supabase SDK aby odczytać session tokens.
       */
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      /**
       * setAll() - Zapisuje cookies w response.
       * Wywoływane przez Supabase SDK aby zapisać/zaktualizować session tokens.
       *
       * @param cookiesToSet - Array of cookies do ustawienia
       */
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
