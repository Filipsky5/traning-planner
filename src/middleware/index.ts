import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract token from Authorization header
  const authHeader = context.request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  // Create per-request Supabase client with user token (if present)
  // This is crucial for RLS - each request needs its own client with auth context
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  });

  context.locals.supabase = supabase;

  // Verify token and get user (if authenticated)
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data?.user) {
      context.locals.user = data.user;

      // Check if user needs onboarding (has fewer than 3 workouts)
      const pathname = new URL(context.request.url).pathname;
      const shouldSkipOnboardingCheck =
        pathname.startsWith('/onboarding') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/_') ||
        /\.(js|css|png|jpg|jpeg|svg|ico|webp)$/.test(pathname);

      if (!shouldSkipOnboardingCheck) {
        // Count user's completed workouts
        const { count, error: countError } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        if (!countError && count !== null && count < 3) {
          // User needs onboarding - redirect to /onboarding
          const nextUrl = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
          return context.redirect(`/onboarding${nextUrl}`, 307);
        }
      }
    }
  }

  return next();
});
