"use client";

import { useState } from "react";
import { Book, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const API_BASE = "https://glorb.dev/api/v1";

interface Endpoint {
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT";
  path: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
  curl?: string;
}

const endpoints: { category: string; items: Endpoint[] }[] = [
  {
    category: "Agents",
    items: [
      {
        method: "GET",
        path: "/agents",
        description: "List all agents in your workspace",
        response: '{ "items": [{ "id": "...", "name": "...", "status": "active" }], "total": 12 }',
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/agents`,
      },
      {
        method: "GET",
        path: "/agents/:agentId",
        description: "Get a single agent with its files",
        response: '{ "id": "...", "name": "...", "agent_files": [...] }',
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/agents/AGENT_ID`,
      },
      {
        method: "POST",
        path: "/agents/:agentId/run",
        description: "Run an agent. Returns a Server-Sent Events stream.",
        body: [
          { name: "message", type: "string", required: true, description: "The user message to send" },
          { name: "conversation_history", type: "MessageParam[]", required: false, description: "Prior conversation messages" },
          { name: "source_framework", type: "string", required: false, description: "Source framework identifier" },
        ],
        response: 'SSE stream: { "type": "text", "content": "..." }',
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}' \\
  ${API_BASE}/agents/AGENT_ID/run`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/manifest",
        description: "Get the agent manifest (universal format for cross-framework use)",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/agents/AGENT_ID/manifest`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/adapter",
        description: "Generate framework-specific adapter code",
        params: [
          { name: "framework", type: "string", required: false, description: "claude-code | cursor | python | raw" },
        ],
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" "${API_BASE}/agents/AGENT_ID/adapter?framework=claude-code"`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/export",
        description: "Download agent as a ZIP archive",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" -o agent.zip ${API_BASE}/agents/AGENT_ID/export`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/sync",
        description: "Read activity feed from all frameworks",
        params: [
          { name: "limit", type: "number", required: false, description: "Max events to return (default: 50)" },
          { name: "since", type: "string", required: false, description: "ISO timestamp filter" },
        ],
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" "${API_BASE}/agents/AGENT_ID/sync?limit=10"`,
      },
      {
        method: "POST",
        path: "/agents/:agentId/sync",
        description: "Report activity from an external framework",
        body: [
          { name: "event_type", type: "string", required: true, description: "Event type (e.g. run_completed)" },
          { name: "source_framework", type: "string", required: true, description: "Framework name" },
          { name: "payload", type: "object", required: false, description: "Event data" },
        ],
        curl: `curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event_type":"run_completed","source_framework":"langchain","payload":{}}' \\
  ${API_BASE}/agents/AGENT_ID/sync`,
      },
    ],
  },
  {
    category: "External Runtime (BYOR)",
    items: [
      {
        method: "POST",
        path: "/agents/:agentId/heartbeat",
        description: "Send a heartbeat from an external runtime. Returns pending directives and config freshness.",
        body: [
          { name: "source_framework", type: "string", required: true, description: "Framework name (e.g. python, langchain)" },
          { name: "session_id", type: "string", required: false, description: "Unique session identifier" },
          { name: "status", type: "string", required: false, description: "running | idle | paused" },
        ],
        response: '{ "heartbeat": {...}, "directives": [...], "config_updated_at": "..." }',
        curl: `curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"source_framework":"python","status":"running"}' \\
  ${API_BASE}/agents/AGENT_ID/heartbeat`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/directives",
        description: "Poll for pending directives (tasks assigned from Glorb UI)",
        params: [
          { name: "status", type: "string", required: false, description: "pending | delivered | completed (default: pending)" },
          { name: "acknowledge", type: "boolean", required: false, description: "Auto-mark as delivered (default: false)" },
        ],
        response: '[{ "id": "...", "type": "task", "message": "Analyze latest sales data", "priority": "normal" }]',
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${API_BASE}/agents/AGENT_ID/directives?status=pending&acknowledge=true"`,
      },
      {
        method: "PATCH",
        path: "/agents/:agentId/directives/:directiveId",
        description: "Update directive status (acknowledge, complete, fail)",
        body: [
          { name: "status", type: "string", required: true, description: "delivered | in_progress | completed | failed" },
          { name: "result", type: "object", required: false, description: "Result data (for completed/failed)" },
        ],
        curl: `curl -X PATCH -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"completed","result":{"output":"Done"}}' \\
  ${API_BASE}/agents/AGENT_ID/directives/DIRECTIVE_ID`,
      },
      {
        method: "POST",
        path: "/agents/:agentId/memories",
        description: "Write memories back to Glorb (synced across all runtimes)",
        body: [
          { name: "key", type: "string", required: true, description: "Memory key" },
          { name: "value", type: "string", required: true, description: "Memory value" },
        ],
        response: '{ "updated": 1, "memories": [{ "key": "...", "value": "..." }] }',
        curl: `curl -X POST -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"key":"last_user","value":"Alice"}' \\
  ${API_BASE}/agents/AGENT_ID/memories`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/memories",
        description: "Read all memories for this agent",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/agents/AGENT_ID/memories`,
      },
      {
        method: "PUT",
        path: "/agents/:agentId/files",
        description: "Push a file to the agent (creates or updates)",
        body: [
          { name: "file_path", type: "string", required: true, description: "File path (e.g. prompt.md)" },
          { name: "content", type: "string", required: true, description: "File content" },
          { name: "file_type", type: "string", required: false, description: "prompt | role | skill | doc | code | file" },
        ],
        curl: `curl -X PUT -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"file_path":"prompt.md","content":"# New prompt\\nYou are..."}' \\
  ${API_BASE}/agents/AGENT_ID/files`,
      },
      {
        method: "GET",
        path: "/agents/:agentId/files",
        description: "List agent files (add ?include_content=true for file contents)",
        params: [
          { name: "include_content", type: "boolean", required: false, description: "Include file contents (default: false)" },
        ],
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${API_BASE}/agents/AGENT_ID/files?include_content=true"`,
      },
    ],
  },
  {
    category: "Clusters",
    items: [
      {
        method: "GET",
        path: "/clusters",
        description: "List all clusters in your workspace",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/clusters`,
      },
      {
        method: "GET",
        path: "/clusters/:clusterId",
        description: "Get cluster details with agents and files",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/clusters/CLUSTER_ID`,
      },
      {
        method: "POST",
        path: "/clusters/:clusterId/run",
        description: "Run a cluster. Returns a Server-Sent Events stream.",
        body: [
          { name: "message", type: "string", required: true, description: "The user message" },
          { name: "source_framework", type: "string", required: false, description: "Framework identifier" },
        ],
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Analyze this data"}' \\
  ${API_BASE}/clusters/CLUSTER_ID/run`,
      },
      {
        method: "GET",
        path: "/clusters/:clusterId/manifest",
        description: "Get cluster manifest",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" ${API_BASE}/clusters/CLUSTER_ID/manifest`,
      },
      {
        method: "GET",
        path: "/clusters/:clusterId/export",
        description: "Download cluster as ZIP",
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" -o cluster.zip ${API_BASE}/clusters/CLUSTER_ID/export`,
      },
      {
        method: "GET",
        path: "/clusters/:clusterId/sync",
        description: "Read cluster activity feed and context docs",
        params: [
          { name: "type", type: "string", required: false, description: "events | docs | all" },
        ],
        curl: `curl -H "Authorization: Bearer YOUR_API_KEY" "${API_BASE}/clusters/CLUSTER_ID/sync?type=all"`,
      },
    ],
  },
  {
    category: "Authentication",
    items: [
      {
        method: "GET",
        path: "*",
        description: "All v1 endpoints require Bearer token authentication. Generate API keys in Settings.",
        curl: `# Include in every request:
curl -H "Authorization: Bearer glb_your_api_key_here" ...`,
      },
    ],
  },
  {
    category: "Rate Limits",
    items: [
      {
        method: "GET",
        path: "*",
        description: "Read endpoints: 60 requests/minute. Run endpoints: 20 requests/minute. Rate limit headers are included in every response.",
        curl: `# Response headers:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 58
# X-RateLimit-Reset: 1711036800
# Retry-After: 12  (only on 429)`,
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-green-500/10 text-green-700 dark:text-green-400",
  POST: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  PUT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
  PATCH: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge className={`font-mono text-xs ${methodColors[endpoint.method]}`} variant="secondary">
          {endpoint.method}
        </Badge>
        <code className="text-sm font-mono flex-1">{endpoint.path}</code>
        <span className="text-sm text-muted-foreground hidden sm:inline">{endpoint.description}</span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          <p className="text-sm">{endpoint.description}</p>

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Query Parameters</h4>
              <div className="space-y-1">
                {endpoint.params.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <code className="font-mono text-xs bg-muted px-1 rounded">{p.name}</code>
                    <span className="text-xs text-muted-foreground">{p.type}</span>
                    {p.required && <Badge variant="destructive" className="text-[10px] h-4">required</Badge>}
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.body && endpoint.body.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Request Body</h4>
              <div className="space-y-1">
                {endpoint.body.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <code className="font-mono text-xs bg-muted px-1 rounded">{p.name}</code>
                    <span className="text-xs text-muted-foreground">{p.type}</span>
                    {p.required && <Badge variant="destructive" className="text-[10px] h-4">required</Badge>}
                    <span className="text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.response && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Response</h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">{endpoint.response}</pre>
            </div>
          )}

          {endpoint.curl && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Example</h4>
                <CopyButton text={endpoint.curl} />
              </div>
              <pre className="text-xs bg-zinc-900 text-zinc-100 p-3 rounded overflow-auto">{endpoint.curl}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Book className="h-6 w-6" />
          API Documentation
        </h1>
        <p className="text-muted-foreground mt-1">
          REST API reference for the Glorb platform. All endpoints require Bearer token authentication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1">{API_BASE}</code>
            <CopyButton text={API_BASE} />
          </div>
        </CardContent>
      </Card>

      {endpoints.map((group) => (
        <div key={group.category} className="space-y-3">
          <h2 className="text-lg font-semibold">{group.category}</h2>
          <div className="space-y-2">
            {group.items.map((endpoint, i) => (
              <EndpointRow key={`${endpoint.method}-${endpoint.path}-${i}`} endpoint={endpoint} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
