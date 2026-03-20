import { Mail, MessageSquare, Building2 } from "lucide-react";

export default function ContactPage() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-14 space-y-3">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Get in touch</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Have a question, feedback, or want to discuss enterprise needs? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center space-y-3">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-violet-500/10">
              <Mail className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="font-medium">General</h3>
            <p className="text-sm text-muted-foreground">For general questions and feedback.</p>
            <a href="mailto:hello@glorb.dev" className="text-sm text-primary hover:underline">
              hello@glorb.dev
            </a>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-6 text-center space-y-3">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-medium">Support</h3>
            <p className="text-sm text-muted-foreground">Technical issues and account help.</p>
            <a href="mailto:support@glorb.dev" className="text-sm text-primary hover:underline">
              support@glorb.dev
            </a>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-6 text-center space-y-3">
            <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-lg bg-emerald-500/10">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <h3 className="font-medium">Enterprise</h3>
            <p className="text-sm text-muted-foreground">Custom plans and partnerships.</p>
            <a href="mailto:sales@glorb.dev" className="text-sm text-primary hover:underline">
              sales@glorb.dev
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
