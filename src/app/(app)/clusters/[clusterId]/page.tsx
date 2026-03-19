"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Code, Download, ArrowLeft, Bot, Play, Blocks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClusterRunner } from "@/components/clusters/cluster-runner";

interface ClusterDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  manager_agent_id: string | null;
  interaction_map: Record<string, string[]>;
  handoff_definitions: { from_agent_id: string; to_agent_id: string; condition: string }[];
  cluster_agents: { agent_id: string; role_in_cluster: string; agent: { id: string; name: string; description: string } }[];
  cluster_files: { id: string; file_name: string; file_path: string; file_type: string }[];
}

export default function ClusterDetailPage({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}) {
  const { clusterId } = use(params);
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);

  useEffect(() => {
    fetch(`/api/clusters/${clusterId}`)
      .then((res) => res.json())
      .then(setCluster);
  }, [clusterId]);

  if (!cluster) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/clusters" />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cluster.name}</h1>
            <Badge variant="outline">{cluster.cluster_agents.length} agents</Badge>
            <Badge variant={cluster.status === "published" ? "default" : "secondary"}>
              {cluster.status}
            </Badge>
          </div>
          {cluster.description && (
            <p className="text-muted-foreground mt-1">{cluster.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button render={<Link href={`/clusters/${clusterId}/builder`} />}>
              <Blocks className="h-4 w-4 mr-2" />
              Builder
          </Button>
          <Button variant="outline" render={<Link href={`/clusters/${clusterId}/visualize`} />}>
              <Eye className="h-4 w-4 mr-2" />
              Visualize
          </Button>
          <Button variant="outline" render={<Link href={`/clusters/${clusterId}/ide`} />}>
              <Code className="h-4 w-4 mr-2" />
              IDE
          </Button>
          <Button variant="outline" render={<a href={`/api/clusters/${clusterId}/export`} download />}>
              <Download className="h-4 w-4 mr-2" />
              Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Run Cluster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClusterRunner clusterId={clusterId} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cluster.cluster_agents.map((ca) => (
                <div
                  key={ca.agent_id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                >
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/agents/${ca.agent.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {ca.agent.name}
                  </Link>
                  {ca.role_in_cluster && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      {ca.role_in_cluster}
                    </Badge>
                  )}
                  {ca.agent_id === cluster.manager_agent_id && (
                    <Badge className="text-xs">Manager</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Handoffs</CardTitle>
          </CardHeader>
          <CardContent>
            {cluster.handoff_definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No handoffs defined</p>
            ) : (
              <div className="space-y-2">
                {cluster.handoff_definitions.map((h, i) => (
                  <div key={i} className="text-sm p-2 rounded bg-muted">
                    <span className="font-mono text-xs">
                      {h.from_agent_id.slice(0, 8)} → {h.to_agent_id.slice(0, 8)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {h.condition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
