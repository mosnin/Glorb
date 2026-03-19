import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, rateLimitResponse, type RateLimitConfig } from "@/lib/rate-limit";

const config: RateLimitConfig = { maxRequests: 3, windowMs: 1000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Use unique keys per test to avoid state leakage
  });

  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const r4 = checkRateLimit(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetMs).toBeGreaterThan(0);
  });

  it("isolates different keys", () => {
    const key1 = `test-iso-a-${Date.now()}`;
    const key2 = `test-iso-b-${Date.now()}`;

    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);

    // key2 should still have quota
    const r = checkRateLimit(key2, config);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("allows requests after window expires", async () => {
    const shortConfig: RateLimitConfig = { maxRequests: 1, windowMs: 50 };
    const key = `test-expire-${Date.now()}`;

    checkRateLimit(key, shortConfig);
    const blocked = checkRateLimit(key, shortConfig);
    expect(blocked.allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 60));

    const allowed = checkRateLimit(key, shortConfig);
    expect(allowed.allowed).toBe(true);
  });
});

describe("rateLimitResponse", () => {
  it("returns null when under limit", () => {
    const key = `test-resp-ok-${Date.now()}`;
    const res = rateLimitResponse(key, config);
    expect(res).toBeNull();
  });

  it("returns 429 Response when over limit", () => {
    const key = `test-resp-429-${Date.now()}`;
    rateLimitResponse(key, config);
    rateLimitResponse(key, config);
    rateLimitResponse(key, config);

    const res = rateLimitResponse(key, config);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBeTruthy();
    expect(res!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
