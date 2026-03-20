const entries = [
  {
    date: "March 18, 2026",
    title: "MCP Server Integration",
    description: "Connect Claude Code, Cursor, or any MCP client to pull agents directly into your projects. Configure your MCP server from Settings.",
    tag: "Feature",
  },
  {
    date: "March 10, 2026",
    title: "Cluster Visualizer",
    description: "New interactive topology view for clusters. See agent relationships, handoff flows, and manager hierarchies at a glance.",
    tag: "Feature",
  },
  {
    date: "March 3, 2026",
    title: "GitHub Sync",
    description: "Two-way sync between your agents and GitHub repositories. Push agent changes to a repo or pull updates back into Glorb.",
    tag: "Feature",
  },
  {
    date: "February 24, 2026",
    title: "Team Collaboration",
    description: "Invite team members to your workspace. Shared agents, clusters, and templates with role-based access control.",
    tag: "Feature",
  },
  {
    date: "February 15, 2026",
    title: "Performance Improvements",
    description: "50% faster agent builds, improved real-time streaming, and reduced dashboard load times.",
    tag: "Improvement",
  },
  {
    date: "February 5, 2026",
    title: "Analytics Dashboard",
    description: "Track agent runs, success rates, token usage, and costs across your entire fleet.",
    tag: "Feature",
  },
];

export default function ChangelogPage() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-14 space-y-3">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Changelog</h1>
          <p className="text-muted-foreground">What&apos;s new and improved in Glorb.</p>
        </div>

        <div className="space-y-0">
          {entries.map((entry, i) => (
            <div key={i} className="relative pl-6 pb-10 border-l border-border/60 last:pb-0">
              <div className="absolute left-0 top-1 -translate-x-1/2 h-2 w-2 rounded-full bg-primary" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <time className="text-xs text-muted-foreground">{entry.date}</time>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {entry.tag}
                  </span>
                </div>
                <h3 className="font-medium">{entry.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
