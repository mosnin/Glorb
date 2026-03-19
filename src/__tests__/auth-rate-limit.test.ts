import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

describe("RATE_LIMITS presets", () => {
  it("has correct api limits", () => {
    expect(RATE_LIMITS.api.maxRequests).toBe(60);
    expect(RATE_LIMITS.api.windowMs).toBe(60_000);
  });

  it("has correct run limits", () => {
    expect(RATE_LIMITS.run.maxRequests).toBe(20);
    expect(RATE_LIMITS.run.windowMs).toBe(60_000);
  });

  it("has correct mcp limits", () => {
    expect(RATE_LIMITS.mcp.maxRequests).toBe(30);
    expect(RATE_LIMITS.mcp.windowMs).toBe(60_000);
  });
});

describe("rate limiter integration", () => {
  it("tracks different keys independently", () => {
    const keyA = `int-test-a-${Date.now()}`;
    const keyB = `int-test-b-${Date.now()}`;

    // Exhaust keyA
    for (let i = 0; i < 3; i++) {
      checkRateLimit(keyA, { maxRequests: 3, windowMs: 60_000 });
    }

    // keyA blocked
    expect(checkRateLimit(keyA, { maxRequests: 3, windowMs: 60_000 }).allowed).toBe(false);

    // keyB still allowed
    expect(checkRateLimit(keyB, { maxRequests: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("returns proper 429 response with headers", () => {
    const key = `int-test-429-${Date.now()}`;
    const config = { maxRequests: 1, windowMs: 60_000 };
    rateLimitResponse(key, config); // Use the one allowed

    const res = rateLimitResponse(key, config);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);

    const headers = Object.fromEntries(res!.headers.entries());
    expect(headers["x-ratelimit-limit"]).toBe("1");
    expect(headers["x-ratelimit-remaining"]).toBe("0");
    expect(headers["retry-after"]).toBeTruthy();
    expect(headers["x-ratelimit-reset"]).toBeTruthy();
  });
});
