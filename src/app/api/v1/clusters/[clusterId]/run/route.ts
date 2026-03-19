import { NextRequest } from "next/server";
import { authenticateWithRateLimit } from "@/lib/auth/api-key";
import { runCluster, type ClusterRunEvent } from "@/lib/ai/cluster-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { processRunCompletion } from "@/lib/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  const authResult = await authenticateWithRateLimit(req, "run");
  if (!authResult) return new Response("Unauthorized", { status: 401 });
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const { clusterId } = await params;
  const { message, source_framework } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();

  // Look up the agents in this cluster
  const { data: clusterData } = await supabase
    .from("clusters")
    .select("cluster_agents(agent_id)")
    .eq("id", clusterId)
    .single();

  const clusterAgentIds = (clusterData?.cluster_agents || []).map(
    (ca: { agent_id: string }) => ca.agent_id
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let hasError = false;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const agentTokens = new Map<string, { input: number; output: number }>();

      try {
        for await (const event of runCluster({ clusterId, userMessage: message })) {
          if (event.type === "error") hasError = true;
          if (event.type === "done" && event.usage) {
            totalInputTokens += event.usage.input_tokens;
            totalOutputTokens += event.usage.output_tokens;
          }

          if (event.agentId && event.type === "done" && event.usage) {
            const existing = agentTokens.get(event.agentId) || { input: 0, output: 0 };
            existing.input += event.usage.input_tokens;
            existing.output += event.usage.output_tokens;
            agentTokens.set(event.agentId, existing);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        const durationMs = Date.now() - startTime;
        const framework = source_framework || "api";

        if (agentTokens.size > 0) {
          for (const [agentId, tokens] of agentTokens) {
            processRunCompletion({
              agentId,
              userId,
              status: hasError ? "failed" : "completed",
              inputTokens: tokens.input,
              outputTokens: tokens.output,
              durationMs,
              sourceFramework: framework,
            }).catch(() => {});
          }
        } else if (clusterAgentIds.length > 0) {
          processRunCompletion({
            agentId: clusterAgentIds[0],
            userId,
            status: hasError ? "failed" : "completed",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            durationMs,
            sourceFramework: framework,
          }).catch(() => {});
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Unknown error" })}\n\n`));

        if (clusterAgentIds.length > 0) {
          processRunCompletion({
            agentId: clusterAgentIds[0],
            userId,
            status: "failed",
            inputTokens: 0,
            outputTokens: 0,
            durationMs: Date.now() - startTime,
            sourceFramework: source_framework || "api",
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
