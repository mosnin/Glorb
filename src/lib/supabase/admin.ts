import { createClient } from "@supabase/supabase-js";

// Service-role client for webhook handlers and admin operations
// Bypasses RLS - use with caution
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key);
}
