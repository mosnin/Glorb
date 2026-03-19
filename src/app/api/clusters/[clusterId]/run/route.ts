import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { runCluster, type ClusterRunEvent } from "@/lib/ai/cluster-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";
import { processRunCompletion } from "@/lib/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { clusterId } = await params;
  const { message, session_id } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();

  // Save user message if session provided
  if (session_id) {
    await supabase.from("chat_messages").insert({
      session_id,
      role: "user",
      content: message,
    });
  }

  // Look up the agents in this cluster so we can track per-agent usage
  const { data: clusterData } = await supabase
    .from("clusters")
    .select("cluster_agents(agent_id)")
    .eq("id", clusterId)
    .single();

  const clusterAgentIds = (clusterData?.cluster_agents || []).map(
    (ca: { agent_id: string }) => ca.agent_id
  );

  dispatchWebhook(userId, "cluster.run.started", { cluster_id: clusterId }).catch(() => {});

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      let hasError = false;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const agentTokens = new Map<string, { input: number; output: number }>();

      try {
        for await (const event of runCluster({ clusterId, userMessage: message })) {
          if (event.type === "text" && event.content) fullResponse += event.content;
          if (event.type === "error") hasError = true;
          if (event.type === "done" && event.usage) {
            totalInputTokens += event.usage.input_tokens;
            totalOutputTokens += event.usage.output_tokens;
          }

          // Track per-agent token usage from delegation results
          if (event.agentId && event.type === "done" && event.usage) {
            const existing = agentTokens.get(event.agentId) || { input: 0, output: 0 };
            existing.input += event.usage.input_tokens;
            existing.output += event.usage.output_tokens;
            agentTokens.set(event.agentId, existing);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        // Save assistant response if session provided
        if (session_id && fullResponse) {
          await supabase.from("chat_messages").insert({
            session_id,
            role: "assistant",
            content: fullResponse,
          });
        }

        const durationMs = Date.now() - startTime;

        // Dispatch completion webhook
        dispatchWebhook(userId, hasError ? "cluster.run.failed" : "cluster.run.completed", {
          cluster_id: clusterId,
          response_length: fullResponse.length,
          duration_ms: durationMs,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        }).catch(() => {});

        // Pipeline: roll up usage for each agent that participated
        // Distribute tokens proportionally if we don't have per-agent data
        if (agentTokens.size > 0) {
          for (const [agentId, tokens] of agentTokens) {
            processRunCompletion({
              agentId,
              userId,
              status: hasError ? "failed" : "completed",
              inputTokens: tokens.input,
              outputTokens: tokens.output,
              durationMs,
              sourceFramework: "web",
            }).catch(() => {});
          }
        } else if (clusterAgentIds.length > 0) {
          // Attribute to the first agent (manager) if no per-agent tracking
          processRunCompletion({
            agentId: clusterAgentIds[0],
            userId,
            status: hasError ? "failed" : "completed",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            durationMs,
            sourceFramework: "web",
          }).catch(() => {});
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Unknown error" })}\n\n`));

        dispatchWebhook(userId, "cluster.run.failed", { cluster_id: clusterId }).catch(() => {});

        // Pipeline: record failure for manager agent
        if (clusterAgentIds.length > 0) {
          processRunCompletion({
            agentId: clusterAgentIds[0],
            userId,
            status: "failed",
            inputTokens: 0,
            outputTokens: 0,
            durationMs: Date.now() - startTime,
            sourceFramework: "web",
          }).catch(() => {});
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
