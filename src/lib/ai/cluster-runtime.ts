import type { Tool, MessageParam, ContentBlock, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicClient } from "@/lib/anthropic";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { executeToolWithConnector, parseToolConnectorConfig, type ToolConnectorConfig } from "./tool-connector";
import type { RunEvent } from "./agent-runtime";

export interface ClusterRunConfig {
  clusterId: string;
  userMessage: string;
  maxTurns?: number;
}

export interface ClusterRunEvent extends RunEvent {
  agentName?: string;
  agentId?: string;
  handoff?: { from: string; to: string; condition: string };
}

interface LoadedAgent {
  id: string;
  name: string;
  systemPrompt: string;
  tools: Tool[];
  model: string;
  maxTokens: number;
  role: string | null;
  toolConnectorConfig: ToolConnectorConfig;
}

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

interface ClusterConfig {
  name: string;
  managerAgentId: string | null;
  agents: LoadedAgent[];
  handoffs: { from_agent_id: string; to_agent_id: string; condition: string; description?: string }[];
  orchestrationRules: OrchestrationRule[];
  clusterPrompt: string;
}

async function loadClusterConfig(clusterId: string): Promise<ClusterConfig> {
  const supabase = createAdminSupabaseClient();

  const { data: cluster, error } = await supabase
    .from("clusters")
    .select("name, manager_agent_id, handoff_definitions, cluster_agents(agent_id, role_in_cluster, agent:agents(id, name, description, configuration)), cluster_files(file_path, file_type, storage_path)")
    .eq("id", clusterId)
    .single();

  if (error || !cluster) throw new Error("Cluster not found");

  // Load orchestration rules
  const { data: rules } = await supabase
    .from("cluster_orchestration_rules")
    .select("*")
    .eq("cluster_id", clusterId)
    .eq("enabled", true)
    .order("priority", { ascending: false });

  let clusterPrompt = "";
  for (const file of cluster.cluster_files || []) {
    if (file.file_type === "cluster_prompt") {
      const { data: blob } = await supabase.storage.from("agent-files").download(file.storage_path);
      if (blob) clusterPrompt = await blob.text();
    }
  }

  const agents: LoadedAgent[] = [];
  for (const ca of cluster.cluster_agents || []) {
    const agent = ca.agent as unknown as { id: string; name: string; description: string; configuration: { model?: string; max_tokens?: number } } | null;
    if (!agent) continue;

    const { data: agentFiles } = await supabase
      .from("agent_files")
      .select("file_path, file_type, storage_path")
      .eq("agent_id", agent.id);

    const files: Record<string, string> = {};
    for (const f of agentFiles || []) {
      const { data: blob } = await supabase.storage.from("agent-files").download(f.storage_path);
      if (blob) files[f.file_path] = await blob.text();
    }

    const promptParts: string[] = [];
    if (files["prompt.md"]) promptParts.push(files["prompt.md"]);
    if (files["role.md"]) promptParts.push(`\n## Role\n\n${files["role.md"]}`);

    const tools: Tool[] = [];
    for (const f of agentFiles || []) {
      if (f.file_type !== "skill") continue;
      const content = files[f.file_path];
      if (!content) continue;
      try {
        const parsed = JSON.parse(content);
        if (parsed.name && parsed.input_schema) {
          tools.push({ name: parsed.name, description: parsed.description || "", input_schema: parsed.input_schema });
        }
      } catch { /* skip */ }
    }

    const toolConnectorConfig = files["config.json"]
      ? parseToolConnectorConfig(files["config.json"])
      : {};

    agents.push({
      id: agent.id,
      name: agent.name,
      systemPrompt: promptParts.join("\n\n") || `You are ${agent.name}. ${agent.description || ""}`,
      tools,
      model: agent.configuration?.model || "claude-sonnet-4-20250514",
      maxTokens: agent.configuration?.max_tokens || 4096,
      role: ca.role_in_cluster,
      toolConnectorConfig,
    });
  }

  return {
    name: cluster.name,
    managerAgentId: cluster.manager_agent_id,
    agents,
    handoffs: cluster.handoff_definitions || [],
    orchestrationRules: rules || [],
    clusterPrompt,
  };
}

function buildManagerSystemPrompt(config: ClusterConfig): string {
  const agentList = config.agents
    .map((a) => `- **${a.name}** (ID: ${a.id})${a.role ? ` — Role: ${a.role}` : ""}`)
    .join("\n");

  const handoffList = config.handoffs
    .map((h) => {
      const from = config.agents.find((a) => a.id === h.from_agent_id)?.name || h.from_agent_id;
      const to = config.agents.find((a) => a.id === h.to_agent_id)?.name || h.to_agent_id;
      return `- ${from} → ${to}: "${h.condition}"${h.description ? ` (${h.description})` : ""}`;
    })
    .join("\n");

  // Build orchestration rules section
  let orchestrationSection = "";
  if (config.orchestrationRules.length > 0) {
    const ruleLines = config.orchestrationRules.map((r) => {
      const from = r.from_agent_id ? config.agents.find((a) => a.id === r.from_agent_id)?.name || r.from_agent_id : "any agent";
      const to = r.to_agent_id ? config.agents.find((a) => a.id === r.to_agent_id)?.name || r.to_agent_id : "any agent";
      const parts = [`- **${r.name}** (${r.rule_type}, priority: ${r.priority})`];
      if (r.rule_type === "condition") {
        parts.push(`  When: ${r.condition_expr || "always"}`);
        parts.push(`  Route: ${from} → ${to}`);
      } else if (r.rule_type === "dependency") {
        parts.push(`  ${to} depends on output from ${from}`);
      } else if (r.rule_type === "priority") {
        parts.push(`  ${to} should be prioritized (priority: ${r.priority})`);
      }
      return parts.join("\n");
    });

    orchestrationSection = `\n\n## Orchestration Rules

These rules MUST be followed when routing tasks. They take precedence over general handoff rules.

${ruleLines.join("\n\n")}`;
  }

  return `${config.clusterPrompt || "You are the manager of a multi-agent cluster."}

## Your Agents

${agentList}

## Handoff Rules

${handoffList || "No explicit handoff rules defined. Route tasks as you see fit."}${orchestrationSection}

## How to Delegate

Use the \`delegate_to_agent\` tool to send tasks to specific agents. You will receive their responses and can then:
- Delegate to another agent if needed
- Synthesize results from multiple agents
- Respond directly to the user

Always explain your coordination decisions. Route work to the most appropriate agent based on the orchestration rules, handoff rules, and agent roles.`;
}

/**
 * Evaluate orchestration rules to determine if a delegation should be
 * redirected or blocked based on the rules.
 */
function evaluateOrchestrationRules(
  config: ClusterConfig,
  fromAgentId: string,
  toAgentId: string,
  completedAgentIds: Set<string>
): { allowed: boolean; redirectTo?: string; reason?: string } {
  // Check dependency rules: if the target agent depends on another agent
  // that hasn't completed yet, block or redirect
  const dependencyRules = config.orchestrationRules.filter(
    (r) => r.rule_type === "dependency" && r.to_agent_id === toAgentId
  );

  for (const rule of dependencyRules) {
    if (rule.from_agent_id && !completedAgentIds.has(rule.from_agent_id)) {
      const depAgent = config.agents.find((a) => a.id === rule.from_agent_id);
      return {
        allowed: false,
        redirectTo: rule.from_agent_id,
        reason: `${config.agents.find((a) => a.id === toAgentId)?.name} depends on ${depAgent?.name || rule.from_agent_id} which hasn't completed yet. Routing to dependency first.`,
      };
    }
  }

  // Check condition rules: if there's a condition-based routing rule
  const conditionRules = config.orchestrationRules
    .filter((r) => r.rule_type === "condition" && r.from_agent_id === fromAgentId)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of conditionRules) {
    if (rule.to_agent_id && rule.to_agent_id !== toAgentId) {
      // There's a higher-priority condition rule that routes elsewhere
      // Only enforce if this is the first matching rule
      return {
        allowed: true,
        reason: `Condition rule "${rule.name}" suggests routing to ${config.agents.find((a) => a.id === rule.to_agent_id)?.name}`,
      };
    }
  }

  return { allowed: true };
}

export async function* runCluster(config: ClusterRunConfig): AsyncGenerator<ClusterRunEvent> {
  const { clusterId, userMessage, maxTurns = 20 } = config;
  const supabase = createAdminSupabaseClient();

  let clusterConfig: ClusterConfig;
  try {
    clusterConfig = await loadClusterConfig(clusterId);
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : "Failed to load cluster" };
    return;
  }

  if (clusterConfig.agents.length === 0) {
    yield { type: "error", error: "Cluster has no agents" };
    return;
  }

  const client = getAnthropicClient();

  const manager = clusterConfig.managerAgentId
    ? clusterConfig.agents.find((a) => a.id === clusterConfig.managerAgentId)
    : clusterConfig.agents[0];

  if (!manager) {
    yield { type: "error", error: "Manager agent not found" };
    return;
  }

  const delegateTool: Tool = {
    name: "delegate_to_agent",
    description: "Delegate a task to a specific agent in the cluster. The agent will process the task and return a result.",
    input_schema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The ID of the agent to delegate to" },
        task: { type: "string", description: "The task description to send to the agent" },
      },
      required: ["agent_id", "task"],
    },
  };

  const managerSystem = buildManagerSystemPrompt(clusterConfig);
  const managerMessages: MessageParam[] = [{ role: "user", content: userMessage }];

  // Track which agents have completed tasks (for dependency resolution)
  const completedAgentIds = new Set<string>();

  let turns = 0;
  yield { type: "text", content: "", agentName: manager.name, agentId: manager.id };

  while (turns < maxTurns) {
    turns++;

    try {
      const stream = await client.messages.stream({
        model: manager.model,
        max_tokens: manager.maxTokens,
        system: managerSystem,
        messages: managerMessages,
        tools: [delegateTool, ...manager.tools],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", content: event.delta.text, agentName: manager.name, agentId: manager.id };
        }
      }

      const finalMessage = await stream.finalMessage();
      const allToolUses = finalMessage.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

      if (allToolUses.length === 0) {
        yield { type: "done", usage: { input_tokens: finalMessage.usage.input_tokens, output_tokens: finalMessage.usage.output_tokens } };
        return;
      }

      const assistantContent: ContentBlock[] = finalMessage.content;
      const toolResults: ToolResultBlockParam[] = [];

      for (const toolUse of allToolUses) {
        if (toolUse.name === "delegate_to_agent") {
          const input = toolUse.input as { agent_id: string; task: string };
          let targetAgentId = input.agent_id;

          // Evaluate orchestration rules before delegating
          if (clusterConfig.orchestrationRules.length > 0) {
            const evaluation = evaluateOrchestrationRules(
              clusterConfig,
              manager.id,
              targetAgentId,
              completedAgentIds
            );

            if (!evaluation.allowed && evaluation.redirectTo) {
              // Redirect to the dependency agent instead
              targetAgentId = evaluation.redirectTo;
              yield {
                type: "text",
                content: `\n[Orchestration] ${evaluation.reason}\n`,
                agentName: "orchestrator",
              };

              // Record the redirect in the task queue
              supabase.from("cluster_task_queue").insert({
                cluster_id: clusterId,
                assigned_agent_id: targetAgentId,
                source_agent_id: manager.id,
                priority: 1,
                input_message: input.task,
                status: "running",
              }).then(() => {});
            }
          }

          const targetAgent = clusterConfig.agents.find((a) => a.id === targetAgentId);

          if (!targetAgent) {
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Agent ${targetAgentId} not found.`, is_error: true });
            continue;
          }

          const handoff = clusterConfig.handoffs.find(
            (h) => h.from_agent_id === manager.id && h.to_agent_id === targetAgent.id
          );

          yield {
            type: "tool_use",
            tool_name: "delegate_to_agent",
            tool_input: input,
            agentName: manager.name,
            agentId: manager.id,
            handoff: handoff
              ? { from: manager.name, to: targetAgent.name, condition: handoff.condition }
              : { from: manager.name, to: targetAgent.name, condition: "delegation" },
          };

          // Record task in queue
          const { data: queueTask } = await supabase
            .from("cluster_task_queue")
            .insert({
              cluster_id: clusterId,
              assigned_agent_id: targetAgent.id,
              source_agent_id: manager.id,
              priority: 0,
              input_message: input.task,
              status: "running",
            })
            .select("id")
            .single();

          // Run worker agent with tool loop
          let workerResponse = "";
          let workerFailed = false;
          try {
            const workerMessages: MessageParam[] = [{ role: "user", content: input.task }];
            let workerTurns = 0;

            while (workerTurns < 5) {
              workerTurns++;

              const workerStream = await client.messages.stream({
                model: targetAgent.model,
                max_tokens: targetAgent.maxTokens,
                system: targetAgent.systemPrompt,
                messages: workerMessages,
                tools: targetAgent.tools.length > 0 ? targetAgent.tools : undefined,
              });

              let turnText = "";
              for await (const event of workerStream) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  turnText += event.delta.text;
                  yield { type: "text", content: event.delta.text, agentName: targetAgent.name, agentId: targetAgent.id };
                }
              }

              workerResponse += turnText;
              const workerFinal = await workerStream.finalMessage();
              const workerToolUses = workerFinal.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

              if (workerToolUses.length === 0) break;

              const workerToolResults: ToolResultBlockParam[] = [];
              for (const wtu of workerToolUses) {
                yield { type: "tool_use", tool_name: wtu.name, tool_input: wtu.input as Record<string, unknown>, agentName: targetAgent.name, agentId: targetAgent.id };
                const toolResult = await executeToolWithConnector(wtu.name, wtu.input as Record<string, unknown>, targetAgent.toolConnectorConfig);
                yield { type: "tool_result", tool_name: wtu.name, tool_result: toolResult, agentName: targetAgent.name, agentId: targetAgent.id };
                workerToolResults.push({ type: "tool_result", tool_use_id: wtu.id, content: toolResult });
              }

              workerMessages.push({ role: "assistant", content: workerFinal.content });
              workerMessages.push({ role: "user", content: workerToolResults });
            }

            if (!workerResponse) workerResponse = "(Agent completed without text output)";
          } catch (err) {
            workerResponse = `Error from ${targetAgent.name}: ${err instanceof Error ? err.message : "Unknown error"}`;
            workerFailed = true;
          }

          // Update task queue status
          if (queueTask) {
            supabase.from("cluster_task_queue").update({
              status: workerFailed ? "failed" : "completed",
              output_message: workerResponse.slice(0, 50000),
              completed_at: new Date().toISOString(),
            }).eq("id", queueTask.id).then(() => {});
          }

          // Mark agent as completed for dependency tracking
          if (!workerFailed) {
            completedAgentIds.add(targetAgent.id);
          }

          yield { type: "tool_result", tool_name: "delegate_to_agent", tool_result: workerResponse, agentName: targetAgent.name, agentId: targetAgent.id };
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Response from ${targetAgent.name}:\n\n${workerResponse}` });
        } else {
          // Manager's own tool
          yield { type: "tool_use", tool_name: toolUse.name, tool_input: toolUse.input as Record<string, unknown>, agentName: manager.name, agentId: manager.id };
          const result = await executeToolWithConnector(toolUse.name, toolUse.input as Record<string, unknown>, manager.toolConnectorConfig);
          yield { type: "tool_result", tool_name: toolUse.name, tool_result: result, agentName: manager.name };
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
        }
      }

      managerMessages.push({ role: "assistant", content: assistantContent });
      managerMessages.push({ role: "user", content: toolResults });
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : "Runtime error" };
      return;
    }
  }

  yield { type: "error", error: "Max turns reached" };
}
