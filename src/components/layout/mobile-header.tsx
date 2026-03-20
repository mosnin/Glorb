"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 py-2.5 md:hidden sticky top-0 z-40">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-xs shadow-sm shadow-violet-500/20">
          G
        </div>
        <span className="text-sm font-semibold">Glorb</span>
      </div>
    </div>
  );
}
