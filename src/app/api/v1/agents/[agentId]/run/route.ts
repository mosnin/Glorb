import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-key";
import { runAgent } from "@/lib/ai/agent-runtime";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const userId = await authenticateRequest(req);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const { message, conversation_history } = await req.json();

  if (!message) return new Response("message is required", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of runAgent({ agentId, userMessage: message, conversationHistory: conversation_history })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
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
