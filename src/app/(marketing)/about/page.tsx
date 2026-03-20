import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const values = [
  {
    title: "Simplicity first",
    description: "AI agent development shouldn't require a PhD. We make complex orchestration accessible through natural language.",
  },
  {
    title: "Open by design",
    description: "Export to any framework. Sync to GitHub. Connect via MCP. Your agents are yours — no vendor lock-in.",
  },
  {
    title: "Built for builders",
    description: "Every feature exists because a real developer needed it. We dogfood Glorb to build our own internal agents.",
  },
  {
    title: "Privacy matters",
    description: "Your agent architectures are your IP. We encrypt data at rest and in transit, and never train on your content.",
  },
];

const team = [
  { name: "Alex Kim", role: "CEO & Co-founder", bio: "Previously built developer tools at Vercel. MIT CS." },
  { name: "Jordan Wu", role: "CTO & Co-founder", bio: "Ex-Google Brain. Led multi-agent research at DeepMind." },
  { name: "Priya Sharma", role: "Head of Product", bio: "Product lead at Stripe and Figma. Stanford MBA." },
  { name: "Marcus Cole", role: "Head of Engineering", bio: "Infrastructure at Cloudflare. Open-source contributor." },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Making AI agents{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              accessible
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Glorb is building the platform that makes it easy for anyone to design,
            build, and deploy AI agent architectures.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="border-t border-border/40 bg-card/30 py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Our mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              The future of software is agentic. AI agents will handle customer support,
              write code, manage workflows, and make decisions. But building these systems
              today requires deep expertise in prompt engineering, orchestration patterns,
              and framework-specific configuration.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We believe this should be as simple as describing what you want. Glorb
              translates natural language into production-ready agent architectures —
              complete with prompts, tools, handoffs, and orchestration rules.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-12">
            What we believe
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {values.map((v) => (
              <div key={v.title} className="space-y-2">
                <h3 className="font-medium">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-border/40 bg-card/30 py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-12">
            The team
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((t) => (
              <div key={t.name} className="text-center space-y-2">
                <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-primary">{t.role}</p>
                </div>
                <p className="text-xs text-muted-foreground">{t.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-2xl font-semibold tracking-tight">Join us</h2>
          <p className="text-muted-foreground">
            We&apos;re hiring engineers, designers, and researchers who want to shape the future of agentic AI.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/careers">
              <Button>View Open Roles <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline">Get in Touch</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
