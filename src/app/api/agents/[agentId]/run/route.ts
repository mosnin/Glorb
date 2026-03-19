import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { runAgent } from "@/lib/ai/agent-runtime";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const { message, session_id, conversation_history } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  const supabase = createAdminSupabaseClient();

  // Save user message if session provided
  if (session_id) {
    await supabase.from("chat_messages").insert({
      session_id,
      role: "user",
      content: message,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";

      try {
        for await (const event of runAgent({ agentId, userMessage: message, conversationHistory: conversation_history })) {
          if (event.type === "text" && event.content) fullResponse += event.content;
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
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err instanceof Error ? err.message : "Unknown error" })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
