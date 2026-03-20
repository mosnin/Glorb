import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollToTop } from "@/components/scroll-to-top";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "Documentation", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-sm">
                G
              </div>
              <span className="text-lg font-semibold">Glorb</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/pricing" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
                Pricing
              </Link>
              <Link href="/about" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
                About
              </Link>
              <Link href="/docs" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
                Docs
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/sign-up"><Button size="sm">Get Started <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* Scroll to top on page change */}
      <ScrollToTop />

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/50">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Footer grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-12 sm:py-16">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-xs">
                  G
                </div>
                <span className="font-semibold">Glorb</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Design, build, and manage AI agent architectures with natural language.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <h4 className="text-sm font-medium mb-3">{heading}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/60 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Glorb. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
