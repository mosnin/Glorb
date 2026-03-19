import Link from "next/link";
import { Plus, Bot, Network, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Architect and manage your AI agents and clusters.
          </p>
        </div>
        <Button render={<Link href="/chat" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/chat">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Start Building</CardTitle>
                <CardDescription>
                  Describe what you need and the AI will architect it
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the chat to create agents, clusters, define roles, handoffs,
                and more.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agents">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Agents</CardTitle>
                <CardDescription>
                  View and edit your individual agents
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Each agent has its own prompt, skills, tools, and role files.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clusters">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Clusters</CardTitle>
                <CardDescription>
                  Manage multi-agent architectures
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clusters group agents with a manager, handoffs, and interaction
                maps.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No agents yet. Start a chat to create your first agent.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Clusters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No clusters yet. Start a chat to create your first cluster.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
