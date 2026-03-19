"use client";

import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import { ClusterCard } from "@/components/clusters/cluster-card";

export default function ClustersPage() {
  const [clusters, setClusters] = useState<
    {
      id: string;
      name: string;
      description: string | null;
      status: string;
      cluster_agents?: { agent: { name: string } }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clusters")
      .then((res) => res.json())
      .then((data) => {
        setClusters(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clusters</h1>
        <p className="text-muted-foreground mt-1">
          Multi-agent architectures with managers, handoffs, and interaction maps.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : clusters.length === 0 ? (
        <div className="text-center py-12">
          <Network className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold">No clusters yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Start a chat to create your first cluster of agents.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <ClusterCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  );
}
