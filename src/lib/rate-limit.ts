/**
 * In-memory sliding-window rate limiter for API routes.
 *
 * Each key (e.g. userId or IP) tracks request timestamps in a rolling window.
 * When the window fills up, subsequent requests are rejected with 429.
 *
 * This is process-local — it resets on deploy and doesn't share state across
 * serverless instances. For a distributed limiter, swap this for Redis/Upstash.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Prevent unbounded memory growth
const MAX_KEYS = 10_000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(windowMs: number) {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();

  const cutoff = Date.now() - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }

  // Hard cap — evict oldest keys
  if (store.size > MAX_KEYS) {
    const keysToDelete = store.size - MAX_KEYS;
    let deleted = 0;
    for (const key of store.keys()) {
      if (deleted >= keysToDelete) break;
      store.delete(key);
      deleted++;
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check if a request should be allowed under the rate limit.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup(config.windowMs);

  const now = Date.now();
  const cutoff = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + config.windowMs - now,
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetMs: config.windowMs,
  };
}

/**
 * Apply rate limiting and return a 429 Response if exceeded, or null if allowed.
 * Adds standard rate limit headers to the response.
 */
export function rateLimitResponse(
  key: string,
  config: RateLimitConfig
): Response | null {
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        retry_after_ms: result.resetMs,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + result.resetMs) / 1000)),
        },
      }
    );
  }

  return null;
}

// Preset configs for different API tiers
export const RATE_LIMITS = {
  /** Public API: 60 requests per minute per user */
  api: { maxRequests: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Agent runs: 20 per minute per user (expensive) */
  run: { maxRequests: 20, windowMs: 60_000 } satisfies RateLimitConfig,
  /** MCP: 30 per minute */
  mcp: { maxRequests: 30, windowMs: 60_000 } satisfies RateLimitConfig,
} as const;
