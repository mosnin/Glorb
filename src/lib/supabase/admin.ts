import { createClient } from "@supabase/supabase-js";

// Service-role client for webhook handlers and admin operations
// Bypasses RLS - use with caution
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
