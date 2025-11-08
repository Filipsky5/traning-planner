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
    }
  }

  return next();
});
