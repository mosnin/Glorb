"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Bot as BotIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClusterBuilder } from "@/components/clusters/cluster-builder";
import { BuilderChatSidebar } from "@/components/clusters/builder-chat-sidebar";

interface ClusterData {
  id: string;
  name: string;
  manager_agent_id: string | null;
  handoff_definitions: { from_agent_id: string; to_agent_id: string; condition: string }[];
  cluster_agents: {
    agent_id: string;
    role_in_cluster: string | null;
    position_x: number;
    position_y: number;
    agent: { id: string; name: string; description: string };
  }[];
}

export default function ClusterBuilderPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const [cluster, setCluster] = useState<ClusterData | null>(null);
  const [userAgents, setUserAgents] = useState<{ id: string; name: string; description: string }[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((res) => res.json())
      .then(setCluster);
    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => setUserAgents(Array.isArray(data) ? data : []));
  }, [clusterId]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  if (!cluster) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading builder...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" render={<Link href={`/clusters/${clusterId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-sm">{cluster.name} — Builder</h1>
          <p className="text-xs text-muted-foreground">
            <BotIcon className="h-3 w-3 inline mr-1" />
            {cluster.cluster_agents.length} agents
          </p>
        </div>
        <Button
          variant={showSidebar ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          AI Builder
        </Button>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1">
          <ClusterBuilder
            clusterId={clusterId}
            initialAgents={cluster.cluster_agents}
            initialHandoffs={cluster.handoff_definitions || []}
            managerAgentId={cluster.manager_agent_id}
            userAgents={userAgents}
          />
        </div>

        {showSidebar && (
          <div className="w-80 border-l">
            <BuilderChatSidebar
              clusterId={clusterId}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
