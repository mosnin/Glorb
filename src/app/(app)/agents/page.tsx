"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import type { Agent } from "@/types/agent";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agents</h1>
        <p className="text-muted-foreground mt-1">
          Your individual AI agents with prompts, skills, tools, and roles.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold">No agents yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Start a chat to create your first agent.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
