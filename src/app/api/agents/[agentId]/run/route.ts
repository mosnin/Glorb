import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { runAgent } from "@/lib/ai/agent-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { dispatchWebhook } from "@/lib/webhooks";
import { processRunCompletion, checkBudget } from "@/lib/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const { message, session_id, conversation_history, trigger_type } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  // Enforce budget limits before starting the run
  const budgetError = await checkBudget({ agentId, userId });
  if (budgetError) {
    return Response.json({ error: budgetError }, { status: 429 });
  }

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

  // Create run record
  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: agentId,
      user_id: userId,
      status: "running",
      input_message: message,
      trigger_type: trigger_type || "manual",
    })
    .select()
    .single();

  // Dispatch webhook
  dispatchWebhook(userId, "agent.run.started", { agent_id: agentId, run_id: run?.id }).catch(() => {});

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      let hasError = false;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let turnNumber = 0;

      try {
        for await (const event of runAgent({ agentId, userMessage: message, userId, conversationHistory: conversation_history })) {
          if (event.type === "text" && event.content) fullResponse += event.content;
          if (event.type === "error") hasError = true;
          if (event.type === "tool_use") turnNumber++;
          if (event.type === "done" && event.usage) {
            totalInputTokens += event.usage.input_tokens;
            totalOutputTokens += event.usage.output_tokens;
          }

          // Record trace event
          if (run) {
            supabase.from("agent_run_events").insert({
              run_id: run.id,
              event_type: event.type,
              turn_number: turnNumber || 1,
              content: event.type === "text" ? event.content : undefined,
              tool_name: event.tool_name,
              tool_input: event.tool_input || undefined,
              tool_result: event.tool_result,
            }).then(() => {});
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

        // Dispatch completion webhook
        dispatchWebhook(userId, hasError ? "agent.run.failed" : "agent.run.completed", {
          agent_id: agentId,
          run_id: run?.id,
          response_length: fullResponse.length,
          duration_ms: Date.now() - startTime,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
        }).catch(() => {});

        // Pipeline: roll up usage, recalculate health, evaluate alerts
        processRunCompletion({
          agentId,
          userId,
          status: hasError ? "failed" : "completed",
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          durationMs: Date.now() - startTime,
          sourceFramework: "web",
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

        dispatchWebhook(userId, "agent.run.failed", { agent_id: agentId, run_id: run?.id }).catch(() => {});

        // Pipeline: record failure in usage/health/alerts
        processRunCompletion({
          agentId,
          userId,
          status: "failed",
          inputTokens: 0,
          outputTokens: 0,
          durationMs: Date.now() - startTime,
          sourceFramework: "web",
        }).catch(() => {});
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
