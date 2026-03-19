"use client";

import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <div className="flex items-center gap-3">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      />
      <span className="text-sm text-muted-foreground">Account</span>
    </div>
  );
}
