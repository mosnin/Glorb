import { describe, it, expect } from "vitest";

// Test the orchestration rule evaluation logic directly
// We extract the pure function logic to test without the full runtime

interface OrchestrationRule {
  id: string;
  name: string;
  rule_type: string;
  from_agent_id: string | null;
  to_agent_id: string | null;
  condition_expr: string | null;
  priority: number;
  enabled: boolean;
}

interface Agent {
  id: string;
  name: string;
}

// Extracted from cluster-runtime.ts for testability
function evaluateOrchestrationRules(
  agents: Agent[],
  rules: OrchestrationRule[],
  fromAgentId: string,
  toAgentId: string,
  completedAgentIds: Set<string>
): { allowed: boolean; redirectTo?: string; reason?: string } {
  // Check dependency rules
  const dependencyRules = rules.filter(
    (r) => r.rule_type === "dependency" && r.to_agent_id === toAgentId
  );

  for (const rule of dependencyRules) {
    if (rule.from_agent_id && !completedAgentIds.has(rule.from_agent_id)) {
      const depAgent = agents.find((a) => a.id === rule.from_agent_id);
      return {
        allowed: false,
        redirectTo: rule.from_agent_id,
        reason: `${agents.find((a) => a.id === toAgentId)?.name} depends on ${depAgent?.name || rule.from_agent_id} which hasn't completed yet. Routing to dependency first.`,
      };
    }
  }

  // Check condition rules
  const conditionRules = rules
    .filter((r) => r.rule_type === "condition" && r.from_agent_id === fromAgentId)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of conditionRules) {
    if (rule.to_agent_id && rule.to_agent_id !== toAgentId) {
      return {
        allowed: true,
        reason: `Condition rule "${rule.name}" suggests routing to ${agents.find((a) => a.id === rule.to_agent_id)?.name}`,
      };
    }
  }

  return { allowed: true };
}

const agents: Agent[] = [
  { id: "manager", name: "Manager" },
  { id: "researcher", name: "Researcher" },
  { id: "writer", name: "Writer" },
  { id: "reviewer", name: "Reviewer" },
];

describe("evaluateOrchestrationRules", () => {
  it("allows delegation when no rules exist", () => {
    const result = evaluateOrchestrationRules(
      agents,
      [],
      "manager",
      "researcher",
      new Set()
    );
    expect(result.allowed).toBe(true);
    expect(result.redirectTo).toBeUndefined();
  });

  it("blocks delegation when dependency agent hasn't completed", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Writer depends on Researcher",
        rule_type: "dependency",
        from_agent_id: "researcher",
        to_agent_id: "writer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
    ];

    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "writer",
      new Set() // researcher hasn't completed
    );

    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("researcher");
    expect(result.reason).toContain("depends on");
    expect(result.reason).toContain("Researcher");
  });

  it("allows delegation when dependency agent has completed", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Writer depends on Researcher",
        rule_type: "dependency",
        from_agent_id: "researcher",
        to_agent_id: "writer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
    ];

    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "writer",
      new Set(["researcher"]) // researcher completed
    );

    expect(result.allowed).toBe(true);
  });

  it("handles chained dependencies", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Writer depends on Researcher",
        rule_type: "dependency",
        from_agent_id: "researcher",
        to_agent_id: "writer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
      {
        id: "rule-2",
        name: "Reviewer depends on Writer",
        rule_type: "dependency",
        from_agent_id: "writer",
        to_agent_id: "reviewer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
    ];

    // Try to go straight to reviewer — writer hasn't completed
    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "reviewer",
      new Set(["researcher"])
    );

    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("writer");
  });

  it("suggests condition-based routing", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Route technical to Researcher",
        rule_type: "condition",
        from_agent_id: "manager",
        to_agent_id: "researcher",
        condition_expr: "task contains technical",
        priority: 10,
        enabled: true,
      },
    ];

    // Manager tries to delegate to writer, but condition rule suggests researcher
    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "writer",
      new Set()
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Researcher");
  });

  it("does not suggest routing when target matches condition rule", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Route to Researcher",
        rule_type: "condition",
        from_agent_id: "manager",
        to_agent_id: "researcher",
        condition_expr: "always",
        priority: 10,
        enabled: true,
      },
    ];

    // Manager delegates to researcher — matches the condition rule
    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "researcher",
      new Set()
    );

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("dependency rules take precedence over condition rules", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Route to Writer",
        rule_type: "condition",
        from_agent_id: "manager",
        to_agent_id: "writer",
        condition_expr: "always",
        priority: 10,
        enabled: true,
      },
      {
        id: "rule-2",
        name: "Writer depends on Researcher",
        rule_type: "dependency",
        from_agent_id: "researcher",
        to_agent_id: "writer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
    ];

    // Try to delegate to writer — dependency blocks it
    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "writer",
      new Set()
    );

    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("researcher");
  });

  it("ignores rules for unrelated agents", () => {
    const rules: OrchestrationRule[] = [
      {
        id: "rule-1",
        name: "Reviewer depends on Writer",
        rule_type: "dependency",
        from_agent_id: "writer",
        to_agent_id: "reviewer",
        condition_expr: null,
        priority: 1,
        enabled: true,
      },
    ];

    // Delegating to researcher — the rule about reviewer doesn't apply
    const result = evaluateOrchestrationRules(
      agents,
      rules,
      "manager",
      "researcher",
      new Set()
    );

    expect(result.allowed).toBe(true);
  });
});
