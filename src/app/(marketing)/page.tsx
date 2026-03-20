import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Network,
  MessageSquare,
  Download,
  Plug,
  Code,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  GitBranch,
  Layers,
  Terminal,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="flex items-center justify-center px-4 py-24 sm:py-32">
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight animate-fade-in-up">
            Build AI agents,{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              effortlessly
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in-up stagger-1">
            Describe what you need in plain language. Glorb architects the agents,
            clusters, handoffs, and tools.
          </p>
          <div className="flex gap-3 justify-center animate-fade-in-up stagger-2 pt-2">
            <Link href="/sign-up">
              <Button size="lg">
                Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                View Pricing
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/60 animate-fade-in-up stagger-3">
            No credit card required. Free tier includes 5 agents.
          </p>
        </div>
      </section>

      {/* Logos / Trust bar */}
      <section className="border-y border-border/40 py-8 px-4">
        <div className="container mx-auto">
          <p className="text-center text-xs text-muted-foreground/60 uppercase tracking-widest mb-6">
            Built with leading AI frameworks
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-muted-foreground/40">
            <span className="text-sm font-medium">OpenAI</span>
            <span className="text-sm font-medium">Anthropic</span>
            <span className="text-sm font-medium">LangChain</span>
            <span className="text-sm font-medium">CrewAI</span>
            <span className="text-sm font-medium">AutoGen</span>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Everything you need
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              A complete platform for designing, building, and managing AI agent systems.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <FeatureCard icon={MessageSquare} title="Chat-First Builder" description="Describe your agent architecture in natural language. The AI iteratively builds agents, skills, tools, and roles." color="violet" />
            <FeatureCard icon={Bot} title="Agent Management" description="Each agent gets its own folder with prompt, skills, tools, and role files. Edit everything in a built-in IDE." color="blue" />
            <FeatureCard icon={Network} title="Cluster Architecture" description="Group agents into clusters with a manager, handoff rules, and interaction maps. Visualize the topology." color="cyan" />
            <FeatureCard icon={Code} title="Built-in IDE" description="Full code editor with syntax highlighting. See changes in real-time as the AI builds your agents." color="emerald" />
            <FeatureCard icon={Download} title="Export Anywhere" description="Download agents and clusters as zip files or sync directly to GitHub repositories." color="amber" />
            <FeatureCard icon={Plug} title="MCP Integration" description="Connect Claude Code, Cursor, or any MCP client to pull your agents directly into projects." color="rose" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 bg-card/30 py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              From idea to production-ready agent in three steps.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Step number={1} title="Describe" description="Tell the AI what you need in plain language. It understands roles, skills, handoffs, and orchestration patterns." />
            <Step number={2} title="Build" description="The AI architect generates agents with prompts, tools, and configurations. Review and refine in the IDE." />
            <Step number={3} title="Deploy" description="Export as code, sync to GitHub, or connect via MCP. Your agents are ready for any framework." />
          </div>
        </div>
      </section>

      {/* Detailed features — alternating rows */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl space-y-20">
          <FeatureRow
            label="Architecture"
            title="Design multi-agent systems visually"
            description="Create clusters of agents that collaborate — with managers, handoff rules, and interaction maps. Visualize the entire topology and understand the flow of information between agents."
            features={["Drag-and-drop builder", "Interaction maps", "Handoff rules", "Manager agents"]}
            icon={Layers}
            reverse={false}
          />
          <FeatureRow
            label="Development"
            title="Built-in IDE for every agent"
            description="Each agent is a folder with structured files: prompts, skills, tools, and roles. Edit everything in a full-featured code editor with syntax highlighting and real-time preview."
            features={["Syntax highlighting", "File tree navigation", "Real-time preview", "Version history"]}
            icon={Terminal}
            reverse
          />
          <FeatureRow
            label="Integration"
            title="Works with your existing stack"
            description="Export agents as code compatible with LangChain, CrewAI, AutoGen, or raw API calls. Sync to GitHub, connect MCP clients, or use the REST API."
            features={["GitHub sync", "MCP server", "REST API", "CLI tool"]}
            icon={GitBranch}
            reverse={false}
          />
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border/40 bg-card/30 py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Stat value="10k+" label="Agents built" />
            <Stat value="2.5k+" label="Active users" />
            <Stat value="99.9%" label="Uptime" />
            <Stat value="<2s" label="Build time" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Loved by builders
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              See what teams are building with Glorb.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Testimonial
              quote="Glorb let us build a 5-agent customer support cluster in under an hour. What used to take our team weeks."
              name="Sarah Chen"
              role="Head of AI, TechCorp"
            />
            <Testimonial
              quote="The chat-first builder is magical. I described what I wanted and had working agents with proper handoffs in minutes."
              name="Marcus Rivera"
              role="Founder, AgentOps"
            />
            <Testimonial
              quote="We use the MCP integration to pull agents directly into our Cursor workflow. It's become essential to our process."
              name="Aisha Patel"
              role="Staff Engineer, DataFlow"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Start building today
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first AI agent in minutes. No configuration required.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/sign-up">
              <Button size="lg">
                Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                Compare Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Sub-components ── */

const colorMap: Record<string, string> = {
  violet: "from-violet-500/15 to-violet-500/5 text-violet-500",
  blue: "from-blue-500/15 to-blue-500/5 text-blue-500",
  cyan: "from-cyan-500/15 to-cyan-500/5 text-cyan-500",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-500",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-500",
};

function FeatureCard({ icon: Icon, title, description, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const colors = colorMap[color] || colorMap.violet;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 space-y-3 transition-all duration-200 hover:border-border hover:shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${colors}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-3">
      <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full border-2 border-primary/20 text-sm font-semibold text-primary">
        {number}
      </div>
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureRow({ label, title, description, features, icon: Icon, reverse }: {
  label: string;
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  reverse: boolean;
}) {
  return (
    <div className={`flex flex-col md:flex-row gap-10 items-center ${reverse ? "md:flex-row-reverse" : ""}`}>
      {/* Text */}
      <div className="flex-1 space-y-4">
        <p className="text-xs font-medium text-primary uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
      {/* Visual */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm aspect-[4/3] rounded-2xl border border-border/60 bg-card flex items-center justify-center">
          <Icon className="h-16 w-16 text-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Testimonial({ quote, name, role }: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
      <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
