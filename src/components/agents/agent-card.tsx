"use client";

import Link from "next/link";
import { Bot, Code, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "@/types/agent";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="hover:border-violet-500/50 hover:shadow-md hover:shadow-violet-500/5 transition-all duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-500/10 p-1.5">
              <Bot className="h-4 w-4 text-violet-500" />
            </div>
            <CardTitle className="text-base">
              <Link
                href={`/agents/${agent.id}`}
                className="hover:underline"
              >
                {agent.name}
              </Link>
            </CardTitle>
          </div>
          <Badge
            variant={agent.status === "published" ? "default" : "secondary"}
          >
            {agent.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {agent.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {agent.description}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/agents/${agent.id}/ide`} />}>
              <Code className="h-3.5 w-3.5 mr-1.5" />
              IDE
          </Button>
          <Button variant="outline" size="sm" render={<a href={`/api/agents/${agent.id}/export`} download />}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
