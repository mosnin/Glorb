import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    team: "Engineering",
    location: "Remote (US/EU)",
    type: "Full-time",
    description: "Build and scale the Glorb platform. Next.js, React, Supabase, Cloudflare Workers.",
  },
  {
    title: "AI/ML Engineer",
    team: "AI",
    location: "Remote",
    type: "Full-time",
    description: "Improve our AI architect — prompt engineering, multi-agent orchestration, and model evaluation.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote (US)",
    type: "Full-time",
    description: "Design intuitive interfaces for complex AI workflows. Figma, prototyping, user research.",
  },
  {
    title: "Developer Advocate",
    team: "Community",
    location: "Remote",
    type: "Full-time",
    description: "Create content, build demos, and grow the Glorb developer community.",
  },
];

export default function CareersPage() {
  return (
    <>
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-14 space-y-3">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Join the team</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Help us make AI agent development accessible to everyone.
            </p>
          </div>

          <div className="space-y-4">
            {openings.map((job) => (
              <div
                key={job.title}
                className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-border transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs text-primary font-medium">{job.team}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="text-xs text-muted-foreground">{job.type}</span>
                  </div>
                </div>
                <Link href={`mailto:careers@glorb.dev?subject=Application: ${job.title}`}>
                  <Button variant="outline" size="sm">
                    Apply <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-card/30 py-16 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl text-center space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Don&apos;t see a fit?</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re always looking for exceptional people. Send us your resume and tell us how you&apos;d contribute.
          </p>
          <a href="mailto:careers@glorb.dev">
            <Button variant="outline">
              Send Open Application
            </Button>
          </a>
        </div>
      </section>
    </>
  );
}
