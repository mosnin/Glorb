import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { runAgent } from "@/lib/ai/agent-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { processRunCompletion } from "@/lib/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const { message, conversation_history, source_framework } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();

  // Create run record
  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: agentId,
      user_id: userId,
      status: "running",
      input_message: message,
      trigger_type: "api",
    })
    .select()
    .single();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      let hasError = false;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let turnNumber = 0;

      try {
        for await (const event of runAgent({ agentId, userMessage: message, conversationHistory: conversation_history })) {
          if (event.type === "text" && event.content) fullResponse += event.content;
          if (event.type === "error") hasError = true;
          if (event.type === "tool_use") turnNumber++;
          if (event.type === "done" && event.usage) {
            totalInputTokens += event.usage.input_tokens;
            totalOutputTokens += event.usage.output_tokens;
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }

        // Update run record
        if (run) {
          await supabase.from("agent_runs").update({
            status: hasError ? "failed" : "completed",
            output_message: fullResponse.slice(0, 50000),
            total_turns: turnNumber,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            duration_ms: Date.now() - startTime,
            error_message: hasError ? "Agent returned an error" : null,
            completed_at: new Date().toISOString(),
          }).eq("id", run.id);
        }

        // Pipeline: roll up usage, recalculate health, evaluate alerts
        processRunCompletion({
          agentId,
          userId,
          status: hasError ? "failed" : "completed",
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          durationMs: Date.now() - startTime,
          sourceFramework: source_framework || "api",
        }).catch(() => {});
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Unknown error" })}\n\n`));

        if (run) {
          await supabase.from("agent_runs").update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
            duration_ms: Date.now() - startTime,
            completed_at: new Date().toISOString(),
          }).eq("id", run.id);
        }

        processRunCompletion({
          agentId,
          userId,
          status: "failed",
          inputTokens: 0,
          outputTokens: 0,
          durationMs: Date.now() - startTime,
          sourceFramework: source_framework || "api",
        }).catch(() => {});
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
