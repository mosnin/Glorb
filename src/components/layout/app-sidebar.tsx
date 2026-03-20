"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Network,
  Library,
  Globe,
  Settings,
  BarChart3,
  Book,
  User,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { UserMenu } from "./user-menu";
import { NotificationCenter } from "./notification-center";

const coreItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Chat", href: "/chat", icon: MessageSquare },
];

const buildItems = [
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Clusters", href: "/clusters", icon: Network },
];

const discoverItems = [
  { title: "Templates", href: "/templates", icon: Library },
  { title: "Marketplace", href: "/marketplace", icon: Globe },
];

const insightItems = [
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Docs", href: "/docs", icon: Book },
];

const systemItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Profile", href: "/profile", icon: User },
];

function NavGroup({ label, items, pathname }: { label: string; items: typeof coreItems; pathname: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-sm shadow-sm group-hover:shadow-violet-500/25 transition-shadow">
              G
            </div>
            <span className="text-lg font-semibold">Glorb</span>
          </Link>
          <NotificationCenter />
        </div>

        {/* Search trigger */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto font-mono text-[10px] text-muted-foreground/60">Ctrl K</kbd>
        </button>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Overview" items={coreItems} pathname={pathname} />
        <NavGroup label="Build" items={buildItems} pathname={pathname} />
        <NavGroup label="Discover" items={discoverItems} pathname={pathname} />
        <NavGroup label="Insights" items={insightItems} pathname={pathname} />
        <SidebarSeparator />
        <NavGroup label="System" items={systemItems} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
