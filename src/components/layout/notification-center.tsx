"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, XCircle, AlertTriangle, DollarSign, Loader2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtime } from "@/hooks/use-realtime";

interface Notification {
  id: string;
  type: "alert" | "budget" | "run_failed" | "run_completed";
  title: string;
  message: string;
  agent_id?: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig = {
  alert: { icon: AlertTriangle, color: "text-yellow-500" },
  budget: { icon: DollarSign, color: "text-orange-500" },
  run_failed: { icon: XCircle, color: "text-red-500" },
  run_completed: { icon: CheckCircle2, color: "text-green-500" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-refresh when new notifications arrive
  useRealtime<Notification>(
    { table: "notifications", event: "INSERT" },
    (payload) => {
      setNotifications((prev) => [payload.new, ...prev].slice(0, 50));
    }
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications/read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    await fetch("/api/notifications", { method: "DELETE" });
    setNotifications([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="w-[min(20rem,100vw-2rem)] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">Notifications</SheetTitle>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <Check className="h-3 w-3 mr-1" />
                  Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-60px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const config = typeConfig[n.type] || typeConfig.alert;
                const Icon = config.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-3 py-2.5 text-sm ${!n.is_read ? "bg-accent/30" : ""}`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
