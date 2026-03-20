import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Network, MessageSquare, Download, Plug, Code, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-sm shadow-md shadow-violet-500/20">
              G
            </div>
            <span className="text-lg font-semibold">Glorb</span>
          </div>
          <div className="flex gap-2">
            <Link href="/sign-in"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/sign-up"><Button size="sm">Get Started <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-24 sm:py-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative text-center space-y-8 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-sm text-muted-foreground animate-fade-in-up">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            AI-Powered Agent Architecture
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight animate-fade-in-up stagger-1">
            Architect Your{" "}
            <span className="bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up stagger-2">
            Glorb is an AI-powered platform for designing, building, and managing
            agentic architectures. Describe what you need — we architect the
            agents, clusters, handoffs, and tools.
          </p>
          <div className="flex gap-3 justify-center animate-fade-in-up stagger-3">
            <Link href="/sign-up">
              <Button size="lg" className="shadow-lg shadow-primary/20">
                Start Building <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-muted/30 py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete toolkit for building, managing, and deploying AI agent systems.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={MessageSquare}
              title="Chat-First Builder"
              description="Describe your agent architecture in natural language. The AI iteratively builds agents, skills, tools, and roles."
              color="violet"
            />
            <FeatureCard
              icon={Bot}
              title="Agent Management"
              description="Each agent gets its own folder with prompt, skills, tools, and role files. Edit everything in a built-in IDE."
              color="blue"
            />
            <FeatureCard
              icon={Network}
              title="Cluster Architecture"
              description="Group agents into clusters with a manager, handoff rules, and interaction maps. Visualize the architecture."
              color="cyan"
            />
            <FeatureCard
              icon={Code}
              title="IDE Editor"
              description="Full code editor with syntax highlighting. See changes in real-time as the AI builds your agents."
              color="emerald"
            />
            <FeatureCard
              icon={Download}
              title="Export Anywhere"
              description="Download agents and clusters as zip files or sync directly to GitHub repositories."
              color="amber"
            />
            <FeatureCard
              icon={Plug}
              title="MCP Integration"
              description="Connect Claude Code, Cursor, or any MCP client to pull your agents directly into projects."
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Glorb — AI Agent Architecture Platform
        </div>
      </footer>
    </div>
  );
}

const colorMap: Record<string, string> = {
  violet: "from-violet-500/15 to-violet-500/5 text-violet-500 group-hover:from-violet-500/25 group-hover:to-violet-500/10",
  blue: "from-blue-500/15 to-blue-500/5 text-blue-500 group-hover:from-blue-500/25 group-hover:to-blue-500/10",
  cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-500 group-hover:from-cyan-500/25 group-hover:to-cyan-500/10",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-500 group-hover:from-emerald-500/25 group-hover:to-emerald-500/10",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-500 group-hover:from-amber-500/25 group-hover:to-amber-500/10",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-500 group-hover:from-rose-500/25 group-hover:to-rose-500/10",
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const colors = colorMap[color] || colorMap.violet;
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-6 space-y-4 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br transition-all duration-300 ${colors}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
