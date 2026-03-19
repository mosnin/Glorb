import { NextRequest } from "next/server";
import { createGlorbMcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// Authenticate via API key bearer token
async function authenticateRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!data) return null;

  // Update last used
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  return data.user_id;
}

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
