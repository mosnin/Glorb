import Link from "next/link";

const posts = [
  {
    title: "Introducing Glorb: AI Agent Architecture Made Simple",
    excerpt: "Today we're launching Glorb — a platform that lets you design, build, and manage AI agent architectures using natural language.",
    date: "March 15, 2026",
    category: "Announcement",
    readTime: "5 min read",
  },
  {
    title: "How We Built a Chat-First Agent Builder",
    excerpt: "A deep dive into the architecture behind Glorb's conversational builder — from prompt engineering to real-time agent generation.",
    date: "March 10, 2026",
    category: "Engineering",
    readTime: "8 min read",
  },
  {
    title: "Multi-Agent Systems: Patterns and Best Practices",
    excerpt: "Lessons learned from building hundreds of multi-agent clusters. When to use managers, how to design handoffs, and common pitfalls.",
    date: "March 5, 2026",
    category: "Guide",
    readTime: "12 min read",
  },
  {
    title: "MCP Integration: Bringing Agents to Your Editor",
    excerpt: "How the Model Context Protocol lets you pull Glorb agents directly into Claude Code, Cursor, and other development tools.",
    date: "February 28, 2026",
    category: "Tutorial",
    readTime: "6 min read",
  },
];

export default function BlogPage() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-14 space-y-3">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">Engineering insights, guides, and product updates.</p>
        </div>

        <div className="space-y-1">
          {posts.map((post) => (
            <article
              key={post.title}
              className="group rounded-xl p-5 -mx-5 hover:bg-card transition-colors border border-transparent hover:border-border/60"
            >
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="text-primary font-medium">{post.category}</span>
                <span>&middot;</span>
                <time>{post.date}</time>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="font-medium text-lg group-hover:text-primary transition-colors mb-1.5">
                {post.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
