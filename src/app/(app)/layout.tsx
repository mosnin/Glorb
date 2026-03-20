import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/layout/command-palette";
import { KeyboardShortcutsHelp } from "@/components/layout/keyboard-shortcuts-help";
import { ErrorBoundary } from "@/components/error-boundary";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <MobileHeader />
        <TopBar />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </SidebarInset>
      <CommandPalette />
      <KeyboardShortcutsHelp />
    </SidebarProvider>
  );
}
