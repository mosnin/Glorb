import { describe, it, expect } from "vitest";
import { parseCron, getNextRun, describeCron } from "@/lib/cron";

describe("parseCron", () => {
  it("parses a wildcard-only expression", () => {
    const fields = parseCron("* * * * *");
    expect(fields).not.toBeNull();
    expect(fields!.minute).toHaveLength(60);
    expect(fields!.hour).toHaveLength(24);
    expect(fields!.dayOfMonth).toHaveLength(31);
    expect(fields!.month).toHaveLength(12);
    expect(fields!.dayOfWeek).toHaveLength(7);
  });

  it("parses specific values", () => {
    const fields = parseCron("0 9 * * 1-5");
    expect(fields).not.toBeNull();
    expect(fields!.minute).toEqual([0]);
    expect(fields!.hour).toEqual([9]);
    expect(fields!.dayOfWeek).toEqual([1, 2, 3, 4, 5]);
  });

  it("parses step values", () => {
    const fields = parseCron("*/15 * * * *");
    expect(fields).not.toBeNull();
    expect(fields!.minute).toEqual([0, 15, 30, 45]);
  });

  it("parses comma-separated values", () => {
    const fields = parseCron("0 9,12,18 * * *");
    expect(fields).not.toBeNull();
    expect(fields!.hour).toEqual([9, 12, 18]);
  });

  it("parses range values", () => {
    const fields = parseCron("0 0 1-15 * *");
    expect(fields).not.toBeNull();
    expect(fields!.dayOfMonth).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("returns null for invalid expressions", () => {
    expect(parseCron("")).toBeNull();
    expect(parseCron("* * *")).toBeNull();
    expect(parseCron("60 * * * *")).toBeNull();
    expect(parseCron("abc * * * *")).toBeNull();
    expect(parseCron("* 25 * * *")).toBeNull();
  });

  it("returns null for too few fields", () => {
    expect(parseCron("0 9 * *")).toBeNull();
  });

  it("returns null for too many fields", () => {
    expect(parseCron("0 9 * * * *")).toBeNull();
  });

  it("handles step with higher base", () => {
    const fields = parseCron("*/30 */6 * * *");
    expect(fields).not.toBeNull();
    expect(fields!.minute).toEqual([0, 30]);
    expect(fields!.hour).toEqual([0, 6, 12, 18]);
  });
});

describe("getNextRun", () => {
  it("returns a date in the future", () => {
    const next = getNextRun("* * * * *");
    expect(next).not.toBeNull();
    expect(next!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns a date within the next minute for every-minute cron", () => {
    const next = getNextRun("* * * * *");
    expect(next).not.toBeNull();
    const diffMs = next!.getTime() - Date.now();
    // Should be within ~2 minutes
    expect(diffMs).toBeLessThan(120_000);
    expect(diffMs).toBeGreaterThan(0);
  });

  it("returns null for an invalid cron", () => {
    expect(getNextRun("invalid")).toBeNull();
  });

  it("returns a date at the correct minute for hourly cron", () => {
    const next = getNextRun("0 * * * *");
    expect(next).not.toBeNull();
    expect(next!.getMinutes()).toBe(0);
  });

  it("returns a date at the correct hour for daily cron", () => {
    const next = getNextRun("0 9 * * *");
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(9);
    expect(next!.getMinutes()).toBe(0);
  });

  it("returns a weekday for weekday-only cron", () => {
    const next = getNextRun("0 9 * * 1-5");
    expect(next).not.toBeNull();
    const day = next!.getDay();
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(5);
  });
});

describe("describeCron", () => {
  it("returns human-readable description for known presets", () => {
    expect(describeCron("0 * * * *")).toBe("Every hour");
    expect(describeCron("0 0 * * *")).toBe("Daily at midnight");
    expect(describeCron("0 9 * * *")).toBe("Daily at 9:00 AM");
    expect(describeCron("*/15 * * * *")).toBe("Every 15 minutes");
    expect(describeCron("0 9 * * 1-5")).toBe("Weekdays at 9:00 AM");
  });

  it("returns the raw expression for unknown patterns", () => {
    expect(describeCron("5 3 * * 2")).toBe("5 3 * * 2");
  });
});
