# Glorb

A platform for building, managing, and orchestrating AI agents. Create individual agents with custom prompts, skills, and tools — then compose them into multi-agent clusters with managers, handoffs, and orchestration rules.

## Features

- **Agent Builder** — Chat-driven interface to create agents with system prompts, skills (tools), roles, and configuration files
- **Agent IDE** — File tree, tabbed editor with syntax highlighting, version history, and auto-save
- **Cluster Orchestration** — Visual builder (ReactFlow) for multi-agent architectures with handoff definitions and interaction maps
- **Agent Runtime** — Streaming execution with tool calling, memory (store/recall), and agentic loops
- **Cross-Framework Sync** — Universal agent manifest format with adapters for Claude Code, Cursor, Python, and raw JSON
- **MCP Server** — Model Context Protocol integration for IDE-native agent access
- **Analytics** — Fleet-wide usage tracking, cost estimation, time-series charts, and CSV export
- **Health Monitoring** — Automatic health status (healthy/degraded/offline) with configurable alert rules
- **Budget Controls** — Monthly token budget enforcement with threshold alerts
- **Webhooks** — Event-driven notifications with HMAC signatures and automatic retry
- **Email Alerts** — Resend integration for alert and budget notifications
- **Marketplace** — Publish, discover, and fork community agents and clusters
- **Rate Limiting** — Per-user sliding-window limits on all public API routes
- **Real-time Updates** — Supabase Realtime subscriptions for live dashboard refresh
- **API Documentation** — Built-in docs page with curl examples for every endpoint

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL + Storage + Realtime)
- **AI**: Anthropic Claude (agent runtime), OpenAI (chat builder)
- **Email**: Resend
- **UI**: Tailwind CSS 4, shadcn/ui, Lucide icons, Sonner toasts
- **Visualization**: ReactFlow (cluster builder)
- **Testing**: Vitest

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your keys (see .env.example for descriptions)

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Environment Variables

See [`.env.example`](.env.example) for all required and optional variables with descriptions. At minimum you need:

- **Clerk** keys (authentication)
- **Supabase** URL + keys (database)
- **Anthropic** API key (agent runtime)

Optional:
- **OpenAI** key (chat builder)
- **GitHub** OAuth (repo sync)
- **Resend** key (email alerts)

## API

All public API endpoints live under `/api/v1/` and require Bearer token authentication.

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/agents` | List agents |
| `POST /api/v1/agents/:id/run` | Run agent (SSE stream) |
| `GET /api/v1/agents/:id/manifest` | Agent manifest |
| `GET /api/v1/agents/:id/adapter` | Framework adapter code |
| `GET /api/v1/agents/:id/sync` | Activity feed |
| `GET /api/v1/clusters` | List clusters |
| `POST /api/v1/clusters/:id/run` | Run cluster (SSE stream) |
| `GET /api/v1/clusters/:id/manifest` | Cluster manifest |

Rate limits: 60 req/min (reads), 20 req/min (runs). See the in-app docs page at `/docs` for full reference.

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated app pages
│   │   ├── agents/     # Agent list, detail, IDE, analytics, pull
│   │   ├── clusters/   # Cluster list, detail, builder, IDE, sync
│   │   ├── dashboard/  # Fleet overview
│   │   ├── analytics/  # Usage & cost analytics
│   │   ├── chat/       # Chat-driven agent builder
│   │   ├── marketplace/# Community listings
│   │   ├── docs/       # API documentation
│   │   ├── profile/    # User preferences
│   │   └── settings/   # API keys, webhooks, workspace
│   └── api/
│       ├── v1/         # Public API (Bearer auth + rate limiting)
│       └── ...         # Internal API (Clerk auth)
├── components/
│   ├── agents/         # Agent-specific components
│   ├── clusters/       # Cluster-specific components
│   ├── ide/            # File tree, editor, tabs
│   ├── layout/         # Sidebar, mobile header, command palette
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Custom React hooks (realtime, shortcuts)
└── lib/
    ├── ai/             # Agent runtime, cluster runtime, builder
    ├── auth/           # API key auth + rate limiting
    ├── supabase/       # Client, server, admin Supabase clients
    ├── pipeline.ts     # Post-run processing pipeline
    ├── webhooks.ts     # Webhook dispatch system
    ├── email.ts        # Resend email templates
    ├── rate-limit.ts   # Sliding-window rate limiter
    ├── manifest.ts     # Universal agent/cluster manifest
    ├── adapters.ts     # Framework-specific adapter generation
    └── mcp/            # MCP server implementation
```

## Testing

```bash
npm test
```

## Deploy

Deploy to Vercel:

```bash
vercel
```

Set all environment variables in Vercel dashboard. Enable Supabase Realtime on `agents`, `agent_health`, `activity_log`, and `agent_runs` tables.
