"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agents/agent-card";
import { Pagination } from "@/components/pagination";
import { ApiError } from "@/components/api-error";
import type { Agent } from "@/types/agent";

const PAGE_SIZE = 24;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`Failed to load agents (${res.status})`);
      const data = await res.json();
      setAgents(data.items || data);
      setTotal(data.total ?? (data.items || data).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
              className="h-40 rounded-lg bg-gradient-to-br from-muted to-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={loadData} />
      ) : agents.length === 0 && page === 1 ? (
        <div className="flex flex-col items-center py-16 animate-fade-in-up">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl" />
            <div className="relative rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-6">
              <Bot className="h-10 w-10 text-violet-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-1">No agents yet</h2>
          <p className="text-muted-foreground text-sm mb-4 text-center max-w-sm">
            Agents are individual AI workers with custom prompts, tools, and roles.
            Start a conversation to build your first one.
          </p>
          <Button render={<Link href="/chat" />}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Building
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, i) => (
              <div key={agent.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 4)}`}>
                <AgentCard agent={agent} />
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
