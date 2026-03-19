import { NextRequest } from "next/server";
import { createGlorbMcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateRequest } from "@/lib/auth/api-key";

export async function POST(req: NextRequest) {
  const userId = await authenticateRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const server = createGlorbMcpServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
  });

  await server.connect(transport);

  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  const userId = await authenticateRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return server info for SSE/polling connections
  return new Response(
    JSON.stringify({
      name: "glorb",
      version: "1.0.0",
      description: "Glorb Agent Architecture Platform - MCP Server",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
