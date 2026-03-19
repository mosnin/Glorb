import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface ToolConnectorConfig {
  mcpServers?: Record<string, { url: string; headers?: Record<string, string> }>;
}

// Cache MCP clients per URL
const clientCache = new Map<string, Client>();

async function getMcpClient(url: string, headers?: Record<string, string>): Promise<Client> {
  const cacheKey = url;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: headers ? { headers } : undefined,
  });

  const client = new Client({ name: "glorb-agent", version: "1.0.0" });
  await client.connect(transport);
  clientCache.set(cacheKey, client);
  return client;
}

export function parseToolConnectorConfig(configJsonContent: string): ToolConnectorConfig {
  try {
    const parsed = JSON.parse(configJsonContent);
    return {
      mcpServers: parsed.mcp_servers || parsed.mcpServers || undefined,
    };
  } catch {
    return {};
  }
}

export async function executeToolWithConnector(
  toolName: string,
  toolInput: Record<string, unknown>,
  config: ToolConnectorConfig
): Promise<string> {
  // Try each configured MCP server
  if (config.mcpServers) {
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        const client = await getMcpClient(serverConfig.url, serverConfig.headers);
        const result = await client.callTool({ name: toolName, arguments: toolInput });

        if (result.content && Array.isArray(result.content)) {
          return result.content
            .map((c: { type: string; text?: string }) => (c.type === "text" ? c.text : JSON.stringify(c)))
            .join("\n");
        }
        return JSON.stringify(result);
      } catch (err) {
        // Tool not found on this server, try next
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("unknown tool")) continue;
        // Other error — report it
        return JSON.stringify({
          error: true,
          server: serverName,
          message: msg,
        });
      }
    }
  }

  // No handler found
  return JSON.stringify({
    status: "no_handler",
    tool: toolName,
    input: toolInput,
    message: `Tool "${toolName}" has no connected handler. Configure an MCP server in config.json to handle this tool.`,
  });
}
