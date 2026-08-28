import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/constants/env";
import type { Database } from "@/lib/database/types";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Returns a Supabase client authenticated with the service role key. Must
 * only ever be used in server-side code: the service role key bypasses row
 * level security and must never reach the browser.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
