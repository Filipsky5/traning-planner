import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type SupabaseClient = SupabaseJsClient<Database>;

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
