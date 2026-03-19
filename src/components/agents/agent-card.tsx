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
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
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
