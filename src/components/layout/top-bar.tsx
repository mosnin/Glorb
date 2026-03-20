"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "Chat",
  "/agents": "Agents",
  "/clusters": "Clusters",
  "/templates": "Templates",
  "/marketplace": "Marketplace",
  "/analytics": "Analytics",
  "/docs": "Documentation",
  "/settings": "Settings",
  "/profile": "Profile",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  // First segment is the section
  if (segments[0]) {
    const sectionPath = `/${segments[0]}`;
    crumbs.push({
      label: breadcrumbMap[sectionPath] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
      href: sectionPath,
    });
  }

  // If there's a sub-page (e.g. /agents/[id]/ide), show a truncated ID and sub-page
  if (segments.length >= 2) {
    // Named sub-pages
    const subPageNames: Record<string, string> = {
      ide: "IDE",
      builder: "Builder",
      visualize: "Visualize",
      sync: "Sync",
    };
    const lastSegment = segments[segments.length - 1];
    if (subPageNames[lastSegment] && segments.length >= 3) {
      crumbs.push({ label: subPageNames[lastSegment], href: pathname });
    } else if (!subPageNames[lastSegment] && segments.length === 2) {
      crumbs.push({ label: "Detail", href: pathname });
    }
  }

  return crumbs;
}

export function TopBar() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <div className="hidden md:flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-40">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/50 mx-1">/</span>}
            <span className={i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:flex items-center gap-2 text-muted-foreground font-normal h-8 w-56 justify-start"
        onClick={() => {
          // Dispatch Ctrl+K to open command palette
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="ml-auto pointer-events-none text-[10px] font-mono text-muted-foreground/60 border rounded px-1 py-0.5 bg-muted/50">
          Ctrl K
        </kbd>
      </Button>
    </div>
  );
}
