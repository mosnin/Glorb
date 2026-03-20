import type { GlorbAgentManifest, GlorbClusterManifest } from "./manifest";

export type Framework = "claude-code" | "cursor" | "python" | "raw";

export interface AdapterOutput {
  framework: string;
  files: Record<string, string>;
  instructions: string;
}

export function generateAdapter(
  manifest: GlorbAgentManifest,
  framework: Framework,
  apiKey: string,
  baseUrl: string
): AdapterOutput {
  switch (framework) {
    case "claude-code":
      return generateClaudeCodeAdapter(manifest, apiKey, baseUrl);
    case "cursor":
      return generateCursorAdapter(manifest, apiKey, baseUrl);
    case "python":
      return generatePythonAdapter(manifest, apiKey, baseUrl);
    case "raw":
      return generateRawAdapter(manifest, apiKey, baseUrl);
    default:
      return generateRawAdapter(manifest, apiKey, baseUrl);
  }
}

function generateClaudeCodeAdapter(
  manifest: GlorbAgentManifest,
  apiKey: string,
  baseUrl: string
): AdapterOutput {
  const claudeMd = `# ${manifest.name}

${manifest.description || ""}

${manifest.prompt || ""}

${manifest.role ? `## Role\n\n${manifest.role}` : ""}

## Agent Identity

This agent is managed by Glorb. Agent ID: \`${manifest.id}\`
Source: ${manifest.sync.events_url}

${manifest.clusters.length > 0 ? `## Cluster Context

${manifest.clusters.map((c) => `### ${c.cluster_name} (Role: ${c.role_in_cluster || "member"})

Peer agents: ${c.peer_agents.map((p) => `${p.name} (${p.role || "member"})`).join(", ")}

${c.context_docs.map((d) => `#### ${d.title}\n${d.content}`).join("\n\n")}
`).join("\n")}` : ""}

${manifest.memories.length > 0 ? `## Memories

${manifest.memories.map((m) => `- **${m.key}**: ${m.value}`).join("\n")}` : ""}
`;

  const mcpConfig = JSON.stringify({
    mcpServers: {
      glorb: {
        url: `${baseUrl}/api/mcp`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    },
  }, null, 2);

  // Sync hook script — now includes heartbeat + directive polling
  const syncHook = `#!/bin/bash
# Glorb sync hook — reports activity and checks for directives
# Add to .claude/hooks or run manually

GLORB_KEY="${apiKey}"
AGENT_ID="${manifest.id}"
BASE="${baseUrl}"

# Send heartbeat (returns pending directives + config freshness)
HEARTBEAT=$(curl -s -X POST "$BASE/api/v1/agents/$AGENT_ID/heartbeat" \\
  -H "Authorization: Bearer $GLORB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"source_framework": "claude-code", "status": "running"}')

echo "Heartbeat: $HEARTBEAT"

# Report session event
curl -s -X POST "$BASE/api/v1/agents/$AGENT_ID/sync" \\
  -H "Authorization: Bearer $GLORB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "run_completed",
    "source_framework": "claude-code",
    "payload": {"message": "Session completed"}
  }'

# Check for pending directives
DIRECTIVES=$(curl -s "$BASE/api/v1/agents/$AGENT_ID/directives?status=pending&acknowledge=true" \\
  -H "Authorization: Bearer $GLORB_KEY")

echo "Directives: $DIRECTIVES"
`;

  const instructions = `## Claude Code Setup

1. Copy \`CLAUDE.md\` to your project root
2. Add MCP config to \`.claude/settings.json\` or your global Claude settings
3. The agent's prompt, role, and cluster context are embedded in CLAUDE.md
4. Use the Glorb MCP tools to pull updates, list agents, or sync activity

### Sync Activity
Run the sync hook or use the MCP \`pull_agent\` tool to refresh context.
`;

  return {
    framework: "claude-code",
    files: {
      "CLAUDE.md": claudeMd,
      ".claude/settings.json": mcpConfig,
      "glorb-sync.sh": syncHook,
    },
    instructions,
  };
}

function generateCursorAdapter(
  manifest: GlorbAgentManifest,
  apiKey: string,
  baseUrl: string
): AdapterOutput {
  const cursorRules = `# ${manifest.name}

${manifest.description || ""}

${manifest.prompt || ""}

${manifest.role ? `## Role\n\n${manifest.role}` : ""}

## Agent Identity
Glorb Agent ID: ${manifest.id}

${manifest.memories.length > 0 ? `## Known Facts\n${manifest.memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")}` : ""}

${manifest.clusters.length > 0 ? `## Cluster Context\n${manifest.clusters.map((c) =>
    `Working in cluster "${c.cluster_name}" as ${c.role_in_cluster || "member"}.
Peers: ${c.peer_agents.map((p) => p.name).join(", ")}
${c.context_docs.map((d) => `\n### ${d.title}\n${d.content}`).join("")}`
  ).join("\n")}` : ""}
`;

  // Skills as tool definitions comment block
  const skillDefs = manifest.skills.length > 0
    ? `## Available Tools\n\n${manifest.skills.map((s) =>
        `### ${s.name}\n${s.description}\nInput: \`${JSON.stringify(s.input_schema)}\``
      ).join("\n\n")}`
    : "";

  const instructions = `## Cursor Setup

1. Copy \`.cursorrules\` to your project root
2. Cursor will use the agent's prompt and context for all interactions
3. Skills are documented in the rules file for reference
`;

  return {
    framework: "cursor",
    files: {
      ".cursorrules": cursorRules + (skillDefs ? `\n\n${skillDefs}` : ""),
    },
    instructions,
  };
}

function generatePythonAdapter(
  manifest: GlorbAgentManifest,
  apiKey: string,
  baseUrl: string
): AdapterOutput {
  const toolDefs = manifest.skills.map((s) => `    {
        "name": "${s.name}",
        "description": ${JSON.stringify(s.description)},
        "input_schema": ${JSON.stringify(s.input_schema)}
    }`).join(",\n");

  const memories = manifest.memories.map((m) =>
    `    "${m.key}": ${JSON.stringify(m.value)}`
  ).join(",\n");

  const agentPy = `"""
${manifest.name} — Glorb Agent Adapter
Auto-generated by Glorb. Agent ID: ${manifest.id}

This module provides the agent's configuration for use with any Python framework.
It keeps the external runtime in sync with Glorb — same prompt, same skills,
same memories, same files. The agent running here IS the Glorb agent.

Key features:
  - Auto-refresh: call heartbeat() regularly; it returns pending directives
    and tells you if config has changed so you can re-pull.
  - Memory write-back: store_memory() / get_memories() keep memories in sync.
  - Directives: poll_directives() gets tasks assigned from the Glorb UI.
  - File sync: push_file() / pull_files() for bidirectional file management.
"""

import json
import urllib.request
import threading
import time

GLORB_API_KEY = "${apiKey}"
GLORB_BASE_URL = "${baseUrl}"
AGENT_ID = "${manifest.id}"
SYNC_URL = "${manifest.sync.events_url}"
HEARTBEAT_URL = "${manifest.sync.heartbeat_url}"
DIRECTIVES_URL = "${manifest.sync.directives_url}"
MEMORIES_URL = "${manifest.sync.memories_url}"
FILES_URL = "${manifest.sync.files_url}"

# Agent configuration (mutable — refresh_config() updates these)
AGENT_NAME = ${JSON.stringify(manifest.name)}
AGENT_DESCRIPTION = ${JSON.stringify(manifest.description || "")}
SYSTEM_PROMPT = ${JSON.stringify(manifest.prompt || `You are ${manifest.name}. ${manifest.description || ""}`)}
${manifest.role ? `ROLE = ${JSON.stringify(manifest.role)}` : "ROLE = None"}
MANIFEST_VERSION = ${JSON.stringify(manifest.manifest_version)}
CONFIG_UPDATED_AT = ${JSON.stringify(manifest.config_updated_at)}

# Tool definitions (Claude-native format)
TOOLS = [
${toolDefs}
]

# Persistent memories (mutable — synced with Glorb)
MEMORIES = {
${memories}
}

_headers = {
    "Authorization": f"Bearer {GLORB_API_KEY}",
    "Content-Type": "application/json",
}

def _request(url: str, data: dict = None, method: str = None) -> dict | list | None:
    """Make an authenticated request to the Glorb API."""
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=_headers, method=method or ("POST" if data else "GET"))
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


# ──────────────────────────────────────────────
# Sync: report activity
# ──────────────────────────────────────────────

def sync_event(event_type: str, payload: dict = None, source: str = "python"):
    """Report activity back to Glorb for cross-framework visibility."""
    _request(SYNC_URL, {
        "event_type": event_type,
        "source_framework": source,
        "payload": payload or {},
    })

def get_activity_feed(limit: int = 50) -> list:
    """Fetch recent activity from all frameworks running this agent."""
    return _request(f"{SYNC_URL}?limit={limit}") or []


# ──────────────────────────────────────────────
# Heartbeat: keep-alive + receive directives
# ──────────────────────────────────────────────

def heartbeat(source: str = "python", session_id: str = None, status: str = "running") -> dict:
    """
    Send heartbeat to Glorb. Returns:
      - directives: list of pending tasks from the Glorb UI
      - config_updated_at: timestamp of last config change (compare with CONFIG_UPDATED_AT)

    If config_updated_at differs from CONFIG_UPDATED_AT, call refresh_config().
    """
    result = _request(HEARTBEAT_URL, {
        "source_framework": source,
        "session_id": session_id,
        "status": status,
    })
    return result or {}

_heartbeat_thread = None
_heartbeat_running = False

def start_heartbeat(interval: int = 30, source: str = "python", on_directive=None, auto_refresh: bool = True):
    """Start a background heartbeat thread. Calls on_directive(directive) for each pending directive."""
    global _heartbeat_thread, _heartbeat_running, SYSTEM_PROMPT, TOOLS, MEMORIES, CONFIG_UPDATED_AT
    _heartbeat_running = True

    def _loop():
        global SYSTEM_PROMPT, TOOLS, MEMORIES, CONFIG_UPDATED_AT
        while _heartbeat_running:
            result = heartbeat(source=source)
            # Auto-refresh config if changed
            if auto_refresh and result.get("config_updated_at") and result["config_updated_at"] != CONFIG_UPDATED_AT:
                refresh_config()
            # Process directives
            for directive in result.get("directives", []):
                if on_directive:
                    on_directive(directive)
                # Auto-acknowledge
                acknowledge_directive(directive["id"])
            time.sleep(interval)

    _heartbeat_thread = threading.Thread(target=_loop, daemon=True)
    _heartbeat_thread.start()

def stop_heartbeat():
    """Stop the background heartbeat thread."""
    global _heartbeat_running
    _heartbeat_running = False


# ──────────────────────────────────────────────
# Config refresh: re-pull from Glorb
# ──────────────────────────────────────────────

def refresh_config():
    """Pull the latest agent manifest from Glorb and update local config."""
    global SYSTEM_PROMPT, TOOLS, MEMORIES, MANIFEST_VERSION, CONFIG_UPDATED_AT, ROLE
    manifest = _request(f"{GLORB_BASE_URL}/api/v1/agents/{AGENT_ID}/manifest")
    if not manifest:
        return
    SYSTEM_PROMPT = manifest.get("prompt") or SYSTEM_PROMPT
    ROLE = manifest.get("role")
    MANIFEST_VERSION = manifest.get("manifest_version", MANIFEST_VERSION)
    CONFIG_UPDATED_AT = manifest.get("config_updated_at", CONFIG_UPDATED_AT)
    # Update tools
    TOOLS.clear()
    TOOLS.extend(manifest.get("skills", []))
    # Update memories
    MEMORIES.clear()
    MEMORIES.update({m["key"]: m["value"] for m in manifest.get("memories", [])})
    sync_event("config_refreshed", {"manifest_version": MANIFEST_VERSION})


# ──────────────────────────────────────────────
# Directives: receive tasks from Glorb UI
# ──────────────────────────────────────────────

def poll_directives(acknowledge: bool = True) -> list:
    """Poll for pending directives (tasks) assigned from the Glorb UI."""
    ack = "&acknowledge=true" if acknowledge else ""
    return _request(f"{DIRECTIVES_URL}?status=pending{ack}") or []

def acknowledge_directive(directive_id: str, status: str = "delivered"):
    """Mark a directive as delivered/in_progress/completed/failed."""
    _request(f"{DIRECTIVES_URL}/{directive_id}", {"status": status}, method="PATCH")

def complete_directive(directive_id: str, result: dict = None):
    """Mark a directive as completed with optional result."""
    _request(f"{DIRECTIVES_URL}/{directive_id}", {"status": "completed", "result": result or {}}, method="PATCH")


# ──────────────────────────────────────────────
# Memory: bidirectional sync
# ──────────────────────────────────────────────

def store_memory(key: str, value: str):
    """Store a memory in Glorb (synced across all runtimes)."""
    _request(MEMORIES_URL, {"key": key, "value": value})
    MEMORIES[key] = value

def store_memories(memories: dict):
    """Store multiple memories at once."""
    batch = [{"key": k, "value": v} for k, v in memories.items()]
    _request(MEMORIES_URL, batch)
    MEMORIES.update(memories)

def get_memories() -> dict:
    """Fetch all memories from Glorb (latest state across all runtimes)."""
    data = _request(MEMORIES_URL) or []
    result = {m["key"]: m["value"] for m in data}
    MEMORIES.update(result)
    return result


# ──────────────────────────────────────────────
# Files: bidirectional sync
# ──────────────────────────────────────────────

def push_file(file_path: str, content: str, file_type: str = None):
    """Push a file to Glorb (creates or updates)."""
    _request(FILES_URL, {"file_path": file_path, "content": content, "file_type": file_type}, method="PUT")

def pull_files(include_content: bool = True) -> list:
    """Pull all agent files from Glorb."""
    qs = "?include_content=true" if include_content else ""
    return _request(f"{FILES_URL}{qs}") or []


# ──────────────────────────────────────────────
# Framework-specific loaders
# ──────────────────────────────────────────────

def to_langchain_tools():
    """Convert Glorb skills to LangChain tool format."""
    from langchain_core.tools import StructuredTool
    tools = []
    for skill in TOOLS:
        def make_fn(s):
            def fn(**kwargs):
                sync_event("tool_called", {"tool": s["name"], "input": kwargs})
                return f"Tool {s['name']} called with: {kwargs}"
            fn.__name__ = s["name"]
            fn.__doc__ = s["description"]
            return fn
        tools.append(StructuredTool.from_function(
            func=make_fn(skill),
            name=skill["name"],
            description=skill["description"],
        ))
    return tools

def to_crewai_agent():
    """Create a CrewAI Agent instance from this Glorb agent."""
    from crewai import Agent
    return Agent(
        role=AGENT_NAME,
        goal=AGENT_DESCRIPTION,
        backstory=SYSTEM_PROMPT,
        verbose=True,
    )


if __name__ == "__main__":
    print(f"Glorb Agent: {AGENT_NAME}")
    print(f"ID: {AGENT_ID}")
    print(f"Manifest version: {MANIFEST_VERSION}")
    print(f"Tools: {len(TOOLS)}")
    print(f"Memories: {len(MEMORIES)}")
    # Start heartbeat (prints directives)
    def on_directive(d):
        print(f"  Directive: [{d['type']}] {d['message']}")
    heartbeat(source="python")
    directives = poll_directives()
    print(f"Pending directives: {len(directives)}")
    print("Ready.")
`;

  const instructions = `## Python Setup

1. Copy \`glorb_agent.py\` to your project
2. Import and use the configuration:

\`\`\`python
from glorb_agent import (
    SYSTEM_PROMPT, TOOLS, MEMORIES,
    sync_event, start_heartbeat, store_memory,
    poll_directives, complete_directive, refresh_config,
)

# Use with Anthropic SDK
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system=SYSTEM_PROMPT,
    tools=TOOLS,
    messages=[{"role": "user", "content": "Hello"}]
)
sync_event("run_completed", {"response_length": len(str(response))})

# Store memories back to Glorb (synced across all runtimes)
store_memory("last_user", "Alice")

# Start background heartbeat (auto-refreshes config when changed in Glorb)
def handle_directive(d):
    print(f"Task from Glorb: {d['message']}")
    complete_directive(d["id"], {"result": "done"})

start_heartbeat(interval=30, on_directive=handle_directive)
\`\`\`

3. For LangChain: \`tools = to_langchain_tools()\`
4. For CrewAI: \`agent = to_crewai_agent()\`

### Staying in Sync

The adapter auto-refreshes when config changes in Glorb:
- \`start_heartbeat()\` — background thread sends heartbeats every 30s,
  auto-pulls new config when Glorb detects changes, and delivers directives.
- \`refresh_config()\` — manually re-pull prompt, skills, and memories.
- \`store_memory(key, value)\` — write memories back to Glorb.
- \`push_file(path, content)\` — push files back to Glorb.
- \`poll_directives()\` — check for tasks assigned from the Glorb UI.
`;

  return {
    framework: "python",
    files: {
      "glorb_agent.py": agentPy,
    },
    instructions,
  };
}

function generateRawAdapter(
  manifest: GlorbAgentManifest,
  apiKey: string,
  baseUrl: string
): AdapterOutput {
  const instructions = `## Raw Agent Data

The glorb.json manifest contains everything you need:
- \`prompt\`: The agent's system prompt
- \`role\`: The agent's role definition
- \`skills\`: Tool definitions in Claude tool_use format
- \`config\`: Model configuration (model, temperature, max_tokens)
- \`files\`: All raw files with content
- \`memories\`: Persistent key-value memories
- \`clusters\`: Cluster context with peer agents and shared docs
- \`sync\`: URLs for reporting activity and reading the feed

### Sync API

**Report activity:**
\`\`\`
POST ${manifest.sync.events_url}
Authorization: Bearer ${apiKey}
Content-Type: application/json

{"event_type": "run_completed", "source_framework": "my-framework", "payload": {}}
\`\`\`

**Read feed:**
\`\`\`
GET ${manifest.sync.activity_feed_url}
Authorization: Bearer ${apiKey}
\`\`\`
`;

  return {
    framework: "raw",
    files: {
      "glorb.json": JSON.stringify(manifest, null, 2),
    },
    instructions,
  };
}
