"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncDashboard } from "@/components/agents/sync-dashboard";
import { ContextDocEditor } from "@/components/clusters/context-doc-editor";

export default function ClusterSyncPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const [clusterName, setClusterName] = useState("");

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((r) => r.json())
      .then((d) => setClusterName(d.name || "Cluster"));
  }, [clusterId]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/clusters/${clusterId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{clusterName} — Sync</h1>
          <p className="text-muted-foreground mt-1">
            Cross-framework activity and shared context documents for this cluster.
          </p>
        </div>
      </div>

      <SyncDashboard clusterId={clusterId} />

      <ContextDocEditor clusterId={clusterId} />
    </div>
  );
}
