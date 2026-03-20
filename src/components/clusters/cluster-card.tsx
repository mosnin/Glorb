"use client";

import Link from "next/link";
import { Network, Code, Download, Eye, Blocks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ClusterCardProps {
  cluster: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    cluster_agents?: { agent: { name: string } }[];
  };
}

export function ClusterCard({ cluster }: ClusterCardProps) {
  const agentCount = cluster.cluster_agents?.length || 0;

  return (
    <Card className="hover:border-blue-500/50 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/10 p-1.5">
              <Network className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-base">
              <Link href={`/clusters/${cluster.id}`} className="hover:underline">
                {cluster.name}
              </Link>
            </CardTitle>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline">{agentCount} agents</Badge>
            <Badge variant={cluster.status === "published" ? "default" : "secondary"}>
              {cluster.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {cluster.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {cluster.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/clusters/${cluster.id}/builder`} />}>
              <Blocks className="h-3.5 w-3.5 mr-1.5" />
              Builder
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/clusters/${cluster.id}/visualize`} />}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Visualize
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/clusters/${cluster.id}/ide`} />}>
              <Code className="h-3.5 w-3.5 mr-1.5" />
              IDE
          </Button>
          <Button variant="outline" size="sm" render={<a href={`/api/clusters/${cluster.id}/export`} download />}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
