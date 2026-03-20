import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals exploring AI agents.",
    features: [
      "5 agents",
      "2 clusters",
      "Chat-first builder",
      "Built-in IDE",
      "Community templates",
      "Export as zip",
    ],
    cta: "Get Started",
    href: "/sign-up",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For professionals building production agents.",
    features: [
      "Unlimited agents",
      "Unlimited clusters",
      "Priority AI architect",
      "GitHub sync",
      "MCP server access",
      "Team collaboration (3 seats)",
      "Analytics dashboard",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/sign-up?plan=pro",
    featured: true,
  },
  {
    name: "Team",
    price: "$79",
    period: "/month",
    description: "For teams building agentic systems at scale.",
    features: [
      "Everything in Pro",
      "10 team seats",
      "Custom templates",
      "Webhooks & API access",
      "Budget alerts",
      "SSO (SAML)",
      "Priority support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    href: "/contact",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 space-y-3">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Start free. Upgrade when you need more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 sm:p-8 flex flex-col ${
                  plan.featured
                    ? "border-primary/50 bg-card shadow-lg shadow-primary/5 relative"
                    : "border-border/60 bg-card"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-medium">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}>
                  <Button className="w-full" variant={plan.featured ? "default" : "outline"}>
                    {plan.cta} {plan.featured && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 py-20 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            <FAQ question="Can I switch plans?" answer="Yes. You can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle." />
            <FAQ question="Is there a free trial for Pro?" answer="Yes, Pro includes a 14-day free trial. No credit card required to start." />
            <FAQ question="What happens when I hit the free plan limits?" answer="You can still access your existing agents but won't be able to create new ones until you upgrade or delete existing agents." />
            <FAQ question="Do you offer discounts for startups?" answer="Yes. We offer 50% off the first year for qualifying startups. Contact us for details." />
            <FAQ question="What payment methods do you accept?" answer="We accept all major credit cards and process payments securely through Stripe." />
          </div>
        </div>
      </section>
    </>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-border/40 pb-6">
      <h3 className="font-medium mb-2">{question}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </div>
  );
}
