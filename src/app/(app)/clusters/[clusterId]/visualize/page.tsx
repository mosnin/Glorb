"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClusterVisualization } from "@/components/clusters/cluster-visualization";

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
    agent: { id: string; name: string };
  }[];
}

export default function ClusterVisualizePage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const [cluster, setCluster] = useState<ClusterData | null>(null);

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load cluster (${res.status})`);
        return res.json();
      })
      .then(setCluster)
      .catch(() => {});
  }, [clusterId]);

  const handlePositionChange = useCallback(
    async (agentId: string, x: number, y: number) => {
      // Update position via API
      await fetch(`/api/clusters/${clusterId}/agents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          position_x: x,
          position_y: y,
        }),
      });
    },
    [clusterId]
  );

  if (!cluster) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const agents = cluster.cluster_agents.map((ca) => ({
    agentId: ca.agent.id,
    name: ca.agent.name,
    role: ca.role_in_cluster,
    isManager: ca.agent_id === cluster.manager_agent_id,
    positionX: ca.position_x,
    positionY: ca.position_y,
  }));

  const handoffs = cluster.handoff_definitions.map((h) => ({
    fromAgentId: h.from_agent_id,
    toAgentId: h.to_agent_id,
    condition: h.condition,
  }));

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="icon" render={<Link href={`/clusters/${clusterId}`} />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-semibold">{cluster.name} — Visualization</h1>
      </div>
      <div className="flex-1">
        <ClusterVisualization
          agents={agents}
          handoffs={handoffs}
          onPositionChange={handlePositionChange}
        />
      </div>
    </div>
  );
}
