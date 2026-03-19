import type { Tool, MessageParam, ContentBlock, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicClient } from "@/lib/anthropic";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { executeToolWithConnector, parseToolConnectorConfig, type ToolConnectorConfig } from "./tool-connector";

export interface RunEvent {
  type: "text" | "tool_use" | "tool_result" | "done" | "error";
  content?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  error?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface AgentRunConfig {
  agentId: string;
  userMessage: string;
  conversationHistory?: MessageParam[];
  maxTurns?: number;
}

interface AgentConfig {
  systemPrompt: string;
  tools: Tool[];
  model: string;
  temperature: number;
  maxTokens: number;
  toolConnectorConfig: ToolConnectorConfig;
}

async function loadAgent(agentId: string): Promise<AgentConfig> {
  const supabase = createAdminSupabaseClient();

  const { data: agent, error } = await supabase
    .from("agents")
    .select("*, agent_files(*)")
    .eq("id", agentId)
    .single();

  if (error || !agent) throw new Error("Agent not found");

  const typedAgent = agent as {
    name: string;
    description: string;
    configuration: { model?: string; temperature?: number; max_tokens?: number };
    agent_files: { file_path: string; file_type: string; storage_path: string }[];
  };

  // Download all files
  const files: Record<string, string> = {};
  for (const f of typedAgent.agent_files) {
    const { data: blob } = await supabase.storage.from("agent-files").download(f.storage_path);
    if (blob) files[f.file_path] = await blob.text();
  }

  // Build system prompt from prompt.md + role.md
  const promptParts: string[] = [];
  if (files["prompt.md"]) promptParts.push(files["prompt.md"]);
  if (files["role.md"]) promptParts.push(`\n## Role\n\n${files["role.md"]}`);
  const systemPrompt = promptParts.join("\n\n") || `You are ${typedAgent.name}. ${typedAgent.description}`;

  // Parse skill files into Claude Tool format
  const tools: Tool[] = [];
  for (const f of typedAgent.agent_files) {
    if (f.file_type !== "skill") continue;
    const content = files[f.file_path];
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      if (parsed.name && parsed.input_schema) {
        tools.push({
          name: parsed.name,
          description: parsed.description || "",
          input_schema: parsed.input_schema,
        });
      }
    } catch { /* skip invalid JSON */ }
  }

  const config = typedAgent.configuration || {};
  const toolConnectorConfig = files["config.json"]
    ? parseToolConnectorConfig(files["config.json"])
    : {};

  return {
    systemPrompt,
    tools,
    model: config.model || "claude-sonnet-4-20250514",
    temperature: config.temperature ?? 0.7,
    maxTokens: config.max_tokens || 4096,
    toolConnectorConfig,
  };
}

export async function* runAgent(config: AgentRunConfig): AsyncGenerator<RunEvent> {
  const { agentId, userMessage, conversationHistory = [], maxTurns = 10 } = config;

  let agentConfig: AgentConfig;
  try {
    agentConfig = await loadAgent(agentId);
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : "Failed to load agent" };
    return;
  }

  const client = getAnthropicClient();
  const messages: MessageParam[] = [...conversationHistory, { role: "user", content: userMessage }];

  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    try {
      const stream = await client.messages.stream({
        model: agentConfig.model,
        max_tokens: agentConfig.maxTokens,
        system: agentConfig.systemPrompt,
        messages,
        tools: agentConfig.tools.length > 0 ? agentConfig.tools : undefined,
      });

      const toolUseBlocks: ToolUseBlock[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", content: event.delta.text };
        }

        if (event.type === "content_block_stop") {
          const msg = stream.currentMessage;
          if (msg) {
            const lastBlock = msg.content[msg.content.length - 1];
            if (lastBlock?.type === "tool_use" && !toolUseBlocks.find((b) => b.id === lastBlock.id)) {
              toolUseBlocks.push(lastBlock);
            }
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      const allToolUses = finalMessage.content.filter((b): b is ToolUseBlock => b.type === "tool_use");

      if (allToolUses.length === 0) {
        yield { type: "done", usage: { input_tokens: finalMessage.usage.input_tokens, output_tokens: finalMessage.usage.output_tokens } };
        return;
      }

      // Process tool calls
      const assistantContent: ContentBlock[] = finalMessage.content;
      const toolResults: ToolResultBlockParam[] = [];

      for (const toolUse of allToolUses) {
        yield { type: "tool_use", tool_name: toolUse.name, tool_input: toolUse.input as Record<string, unknown> };

        try {
          const result = await executeToolWithConnector(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            agentConfig.toolConnectorConfig
          );

          yield { type: "tool_result", tool_name: toolUse.name, tool_result: result };
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Tool execution failed";
          yield { type: "tool_result", tool_name: toolUse.name, tool_result: errorMsg };
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: errorMsg, is_error: true });
        }
      }

      messages.push({ role: "assistant", content: assistantContent });
      messages.push({ role: "user", content: toolResults });
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : "Runtime error" };
      return;
    }
  }

  yield { type: "error", error: "Max turns reached" };
}
