import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing pipeline
const mockFrom = vi.fn();
const mockStorage = {
  from: vi.fn().mockReturnValue({
    download: vi.fn().mockResolvedValue({ data: new Blob(["test"]) }),
  }),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: mockFrom,
    storage: mockStorage,
  }),
}));

vi.mock("@/lib/webhooks", () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

// Helper to build chainable query mock
function mockQuery(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "or", "gte", "lte", "not", "order", "limit",
    "single", "maybeSingle",
  ];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Terminal methods return data
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  // For non-terminal, return the chain
  const handler = vi.fn().mockReturnValue(chain);
  return { handler, chain };
}

describe("pipeline - createAutoSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("skips pre_edit snapshot within cooldown window", async () => {
    // Reset module to clear cooldown cache
    vi.resetModules();

    const agentQuery = mockQuery({
      id: "agent-1",
      name: "Test Agent",
      description: "desc",
      status: "draft",
      configuration: {},
      agent_files: [],
    });

    const memoriesQuery = mockQuery([]);
    const countQuery = mockQuery(null);
    countQuery.chain.select = vi.fn().mockReturnValue({
      ...countQuery.chain,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const snapshotInsert = mockQuery({ id: "snap-1" });

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "agents") return agentQuery.chain;
      if (table === "agent_memories") return memoriesQuery.chain;
      if (table === "agent_snapshots") {
        callCount++;
        if (callCount <= 1) return countQuery.chain;
        return snapshotInsert.chain;
      }
      return mockQuery().chain;
    });

    // Re-import to get fresh module with clean cooldown cache
    const { createAutoSnapshot } = await import("@/lib/pipeline");

    // First call should proceed
    await createAutoSnapshot({ agentId: "agent-1", userId: "user-1", trigger: "pre_edit" });

    // Second call within cooldown should be skipped
    const fromCallsBefore = mockFrom.mock.calls.length;
    await createAutoSnapshot({ agentId: "agent-1", userId: "user-1", trigger: "pre_edit" });
    const fromCallsAfter = mockFrom.mock.calls.length;

    // No new DB calls should have been made
    expect(fromCallsAfter).toBe(fromCallsBefore);
  });

  it("allows publish snapshots regardless of cooldown", async () => {
    vi.resetModules();

    const agentQuery = mockQuery({
      id: "agent-1",
      name: "Test Agent",
      description: "desc",
      status: "draft",
      configuration: {},
      agent_files: [],
    });

    const memoriesQuery = mockQuery([]);
    const countQuery = mockQuery(null);
    countQuery.chain.select = vi.fn().mockReturnValue({
      ...countQuery.chain,
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    const snapshotInsert = mockQuery({ id: "snap-1" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "agents") return agentQuery.chain;
      if (table === "agent_memories") return memoriesQuery.chain;
      if (table === "agent_snapshots") return { ...countQuery.chain, insert: snapshotInsert.chain.insert };
      return mockQuery().chain;
    });

    const { createAutoSnapshot } = await import("@/lib/pipeline");

    // Two publish snapshots back-to-back should both proceed
    await createAutoSnapshot({ agentId: "agent-1", userId: "user-1", trigger: "publish" });
    await createAutoSnapshot({ agentId: "agent-1", userId: "user-1", trigger: "publish" });

    // Both should have hit the agents table
    const agentCalls = mockFrom.mock.calls.filter((c: string[]) => c[0] === "agents");
    expect(agentCalls.length).toBe(2);
  });
});

// Deep chainable mock where every method returns itself and has terminal resolvers
function deepChain(terminalResult: { data: unknown; error?: unknown; count?: number } = { data: null }) {
  const proxy: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "or", "gte", "lte", "not", "order", "limit",
    "single", "maybeSingle", "contains", "then",
  ];
  for (const method of methods) {
    if (method === "single" || method === "maybeSingle") {
      proxy[method] = vi.fn().mockResolvedValue(terminalResult);
    } else if (method === "then") {
      // Make the chain thenable (resolves when awaited directly)
      proxy[method] = vi.fn().mockImplementation((resolve: (v: unknown) => void) => {
        resolve(terminalResult);
      });
    } else {
      proxy[method] = vi.fn().mockReturnValue(proxy);
    }
  }
  return proxy;
}

describe("pipeline - processRunCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new usage_daily row when none exists", async () => {
    vi.resetModules();

    const insertData: Record<string, unknown>[] = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "agent_usage_daily") {
        const chain = deepChain({ data: null });
        chain.insert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertData.push(data);
          return deepChain({ data: null });
        });
        return chain;
      }
      if (table === "agent_runs") {
        return deepChain({ data: [] });
      }
      if (table === "agent_health") {
        return deepChain({ data: null });
      }
      if (table === "agent_alert_rules") {
        return deepChain({ data: [] });
      }
      if (table === "agent_token_budgets") {
        return deepChain({ data: [] });
      }
      return deepChain({ data: null });
    });

    const { processRunCompletion } = await import("@/lib/pipeline");

    await processRunCompletion({
      agentId: "agent-1",
      userId: "user-1",
      status: "completed",
      inputTokens: 1000,
      outputTokens: 500,
      durationMs: 3000,
      sourceFramework: "web",
    });

    expect(insertData.length).toBe(1);
    expect(insertData[0].run_count).toBe(1);
    expect(insertData[0].success_count).toBe(1);
    expect(insertData[0].error_count).toBe(0);
    expect(insertData[0].input_tokens).toBe(1000);
    expect(insertData[0].output_tokens).toBe(500);
    expect(insertData[0].source_framework).toBe("web");
  });

  it("records failure status correctly", async () => {
    vi.resetModules();

    const insertData: Record<string, unknown>[] = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "agent_usage_daily") {
        const chain = deepChain({ data: null });
        chain.insert = vi.fn().mockImplementation((data: Record<string, unknown>) => {
          insertData.push(data);
          return deepChain({ data: null });
        });
        return chain;
      }
      if (table === "agent_runs") {
        return deepChain({ data: [] });
      }
      return deepChain({ data: null });
    });

    const { processRunCompletion } = await import("@/lib/pipeline");

    await processRunCompletion({
      agentId: "agent-1",
      userId: "user-1",
      status: "failed",
      inputTokens: 500,
      outputTokens: 0,
      durationMs: 1000,
      sourceFramework: "api",
    });

    expect(insertData.length).toBe(1);
    expect(insertData[0].success_count).toBe(0);
    expect(insertData[0].error_count).toBe(1);
    expect(insertData[0].source_framework).toBe("api");
  });
});
