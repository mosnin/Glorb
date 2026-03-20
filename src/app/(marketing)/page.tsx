import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Network, MessageSquare, Download, Plug, Code } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <span className="text-lg font-semibold">Glorb</span>
          </div>
          <div className="flex gap-2">
            <Link href="/sign-in"><Button variant="ghost">Sign In</Button></Link>
            <Link href="/sign-up"><Button>Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center space-y-6 max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Architect Your
            <span className="text-primary"> AI Agents</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Glorb is an AI-powered platform for designing, building, and managing
            agentic architectures. Describe what you need — we architect the
            agents, clusters, handoffs, and tools.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/sign-up"><Button size="lg">Start Building</Button></Link>
            <Link href="/sign-in"><Button size="lg" variant="outline">Sign In</Button></Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={MessageSquare}
              title="Chat-First Builder"
              description="Describe your agent architecture in natural language. The AI iteratively builds agents, skills, tools, and roles."
            />
            <FeatureCard
              icon={Bot}
              title="Agent Management"
              description="Each agent gets its own folder with prompt, skills, tools, and role files. Edit everything in a built-in IDE."
            />
            <FeatureCard
              icon={Network}
              title="Cluster Architecture"
              description="Group agents into clusters with a manager, handoff rules, and interaction maps. Visualize the architecture."
            />
            <FeatureCard
              icon={Code}
              title="IDE Editor"
              description="Full code editor with syntax highlighting. See changes in real-time as the AI builds your agents."
            />
            <FeatureCard
              icon={Download}
              title="Export Anywhere"
              description="Download agents and clusters as zip files or sync directly to GitHub repositories."
            />
            <FeatureCard
              icon={Plug}
              title="MCP Integration"
              description="Connect Claude Code, Cursor, or any MCP client to pull your agents directly into projects."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Glorb — AI Agent Architecture Platform
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
