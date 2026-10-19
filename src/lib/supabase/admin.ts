import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the service_role key — BYPASSES RLS.
 * SERVER ONLY. Never import this from a Client Component and never expose the key.
 * Used by Route Handlers for newsletter signup/confirm and signed downloads.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** True when the env required for Supabase server operations is present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
