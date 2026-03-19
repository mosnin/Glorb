import crypto from "crypto";
import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkRateLimit, RATE_LIMITS, type RateLimitResult } from "@/lib/rate-limit";

export interface AuthResult {
  userId: string;
  rateLimit: RateLimitResult;
}

// Shared Bearer token authentication for public API routes
export async function authenticateRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!data) return null;

  // Update last used timestamp
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  return data.user_id;
}

/**
 * Authenticate and apply rate limiting in one step.
 * Returns null (unauthorized) or the auth result with rate limit info.
 *
 * If rate limit is exceeded, returns a 429 Response directly — callers
 * should check `if (result instanceof Response)`.
 */
export async function authenticateWithRateLimit(
  req: NextRequest,
  limitKey: keyof typeof RATE_LIMITS = "api"
): Promise<string | Response | null> {
  const userId = await authenticateRequest(req);
  if (!userId) return null;

  const rl = checkRateLimit(`v1:${userId}`, RATE_LIMITS[limitKey]);

  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        retry_after_ms: rl.resetMs,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMITS[limitKey].maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + rl.resetMs) / 1000)),
        },
      }
    );
  }

  return userId;
}
