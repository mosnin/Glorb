"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Network, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClusterCard } from "@/components/clusters/cluster-card";
import { Pagination } from "@/components/pagination";
import { ApiError } from "@/components/api-error";

const PAGE_SIZE = 24;

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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clusters?page=${page}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`Failed to load clusters (${res.status})`);
      const data = await res.json();
      setClusters(data.items || data);
      setTotal(data.total ?? (data.items || data).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clusters");
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
        <h1 className="text-3xl font-bold">Clusters</h1>
        <p className="text-muted-foreground mt-1">
          Multi-agent architectures with managers, handoffs, and interaction maps.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={loadData} />
      ) : clusters.length === 0 && page === 1 ? (
        <div className="flex flex-col items-center py-16 animate-fade-in-up">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
            <div className="relative rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6">
              <Network className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-1">No clusters yet</h2>
          <p className="text-muted-foreground text-sm mb-4 text-center max-w-sm">
            Clusters are teams of agents that collaborate — with managers, handoffs,
            and orchestration rules. Describe your workflow to get started.
          </p>
          <Button render={<Link href="/chat" />}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start Building
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clusters.map((cluster, i) => (
              <div key={cluster.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 4)}`}>
                <ClusterCard cluster={cluster} />
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
