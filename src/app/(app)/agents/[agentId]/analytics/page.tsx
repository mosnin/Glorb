"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "@/components/agents/analytics-dashboard";

export default function AgentAnalyticsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [agentName, setAgentName] = useState("");

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((d) => setAgentName((d as { name?: string }).name || "Agent"));
  }, [agentId]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/agents/${agentId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{agentName} — Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Token usage, cost tracking, and performance metrics.
          </p>
        </div>
      </div>

      <AnalyticsDashboard agentId={agentId} />
    </div>
  );
}
