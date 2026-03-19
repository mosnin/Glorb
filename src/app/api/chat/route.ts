import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { AGENT_ARCHITECT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { ARCHITECT_TOOLS } from "@/lib/ai/tools";
import { executeToolCall } from "@/lib/ai/agent-builder";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { session_id, messages } = await req.json();

  if (!session_id || !Array.isArray(messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  const openai = getOpenAIClient();
  const supabase = createAdminSupabaseClient();
  const startTime = Date.now();

  // Save user message to DB
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === "user") {
    await supabase.from("chat_messages").insert({
      session_id,
      role: "user",
      content: lastUserMessage.content,
    });
  }

  // Look up the session to check for an associated agent
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("agent_id, cluster_id")
    .eq("id", session_id)
    .single();

  // Build conversation with system prompt
  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: AGENT_ARCHITECT_SYSTEM_PROMPT },
    ...messages,
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalToolCalls = 0;
      let hasError = false;

      try {
        let continueLoop = true;
        let currentMessages = conversationMessages;

        while (continueLoop) {
          continueLoop = false;

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: currentMessages,
            tools: ARCHITECT_TOOLS,
            stream: true,
            stream_options: { include_usage: true },
          });

          let assistantContent = "";
          const toolCalls: Map<
            number,
            { id: string; function: { name: string; arguments: string } }
          > = new Map();

          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;

            // Stream text content
            if (delta?.content) {
              assistantContent += delta.content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`
                )
              );
            }

            // Accumulate tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls.has(tc.index)) {
                  toolCalls.set(tc.index, {
                    id: tc.id || "",
                    function: { name: tc.function?.name || "", arguments: "" },
                  });
                }
                const existing = toolCalls.get(tc.index)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.function.name = tc.function.name;
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments;
                }
              }
            }

            // Capture usage from the final chunk
            if (chunk.usage) {
              totalInputTokens += chunk.usage.prompt_tokens;
              totalOutputTokens += chunk.usage.completion_tokens;
            }
          }

          // If there are tool calls, execute them and continue
          if (toolCalls.size > 0) {
            totalToolCalls += toolCalls.size;
            const toolCallsArray: ChatCompletionMessageToolCall[] = [];
            const toolResults: ChatCompletionMessageParam[] = [];

            for (const [, tc] of toolCalls) {
              toolCallsArray.push({
                id: tc.id,
                type: "function",
                function: tc.function,
              });

              const toolArgs = JSON.parse(tc.function.arguments);

              // Notify client about tool execution
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_call",
                    tool_name: tc.function.name,
                    arguments: toolArgs,
                  })}\n\n`
                )
              );

              try {
                const result = await executeToolCall(
                  tc.function.name,
                  toolArgs,
                  userId
                );

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "tool_result",
                      tool_name: tc.function.name,
                      result,
                    })}\n\n`
                  )
                );

                toolResults.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                });
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "tool_error",
                      tool_name: tc.function.name,
                      error: errorMessage,
                    })}\n\n`
                  )
                );

                toolResults.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: errorMessage }),
                });
              }
            }

            // Continue the conversation with tool results
            currentMessages = [
              ...currentMessages,
              {
                role: "assistant" as const,
                content: assistantContent || null,
                tool_calls: toolCallsArray,
              },
              ...toolResults,
            ];
            continueLoop = true;
          } else {
            // No tool calls — save assistant response and finish
            if (assistantContent) {
              await supabase.from("chat_messages").insert({
                session_id,
                role: "assistant",
                content: assistantContent,
                metadata: {
                  tool_calls: Array.from(toolCalls.values()).map((tc) => ({
                    tool_name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments || "{}"),
                  })),
                },
              });
            }
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
      } catch (error) {
        hasError = true;
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
      }

      // Record the chat interaction as an agent run if tied to an agent
      const durationMs = Date.now() - startTime;
      if (session?.agent_id) {
        await supabase.from("agent_runs").insert({
          agent_id: session.agent_id,
          user_id: userId,
          status: hasError ? "failed" : "completed",
          input_message: lastUserMessage?.content || "",
          output_message: "(architect chat session)",
          trigger_type: "manual",
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_turns: totalToolCalls,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        });
      }

      // Log to activity feed
      supabase
        .from("activity_log")
        .insert({
          user_id: userId,
          action: "chat_completion",
          entity_type: "chat",
          entity_id: session_id,
          metadata: {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            tool_calls: totalToolCalls,
            duration_ms: durationMs,
            agent_id: session?.agent_id || null,
          },
        })
        .then(() => {});

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
