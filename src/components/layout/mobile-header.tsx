"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileHeader() {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-blue-600 text-white font-bold text-[10px]">
          G
        </div>
        <span className="text-sm font-semibold">Glorb</span>
      </div>
    </div>
  );
}
