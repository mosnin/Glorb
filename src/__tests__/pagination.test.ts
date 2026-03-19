import { describe, it, expect } from "vitest";

describe("pagination logic", () => {
  function paginate(page: number, pageSize: number, total: number) {
    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const from = offset;
    const to = offset + pageSize - 1;
    return { totalPages, from, to, hasNext: page < totalPages, hasPrev: page > 1 };
  }

  it("computes single page correctly", () => {
    const result = paginate(1, 24, 10);
    expect(result.totalPages).toBe(1);
    expect(result.from).toBe(0);
    expect(result.to).toBe(23);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("computes multiple pages correctly", () => {
    const result = paginate(2, 24, 50);
    expect(result.totalPages).toBe(3);
    expect(result.from).toBe(24);
    expect(result.to).toBe(47);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(true);
  });

  it("computes last page", () => {
    const result = paginate(3, 24, 50);
    expect(result.totalPages).toBe(3);
    expect(result.from).toBe(48);
    expect(result.to).toBe(71);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it("handles empty set", () => {
    const result = paginate(1, 24, 0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("handles exact page boundary", () => {
    const result = paginate(1, 24, 24);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
  });
});
