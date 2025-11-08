import type { APIContext } from "astro";

import { createApiError } from "./errors";

export async function requireUserId(context: APIContext): Promise<{ userId: string }> {
  const supabase = context.locals.supabase;
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw createApiError(401, "unauthorized", "Invalid or expired session", { cause: error });
  }

  const user = data?.user;
  if (!user) {
    throw createApiError(401, "unauthorized", "User session is required");
  }

  return { userId: user.id };
}

