"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeSubscription {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically manages channel lifecycle (subscribe on mount, unsubscribe on unmount).
 *
 * @example
 * useRealtime(
 *   { table: "agent_runs", event: "INSERT", filter: `agent_id=eq.${agentId}` },
 *   (payload) => { setRuns(prev => [payload.new, ...prev]) }
 * );
 */
export function useRealtime<T = Record<string, unknown>>(
  subscription: RealtimeSubscription,
  onPayload: (payload: { new: T; old: T; eventType: string }) => void
) {
  const supabase = useSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  useEffect(() => {
    if (!supabase) return;

    const channelName = `realtime:${subscription.table}:${subscription.filter || "all"}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as "system",
        {
          event: subscription.event || "*",
          schema: subscription.schema || "public",
          table: subscription.table,
          filter: subscription.filter,
        } as Record<string, string | undefined>,
        (payload: Record<string, unknown>) => {
          callbackRef.current({
            new: payload.new as T,
            old: payload.old as T,
            eventType: payload.eventType as string,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, subscription.table, subscription.event, subscription.filter, subscription.schema]);
}

/**
 * Subscribe to multiple tables at once. Returns a stable cleanup function.
 *
 * @example
 * useRealtimeMulti([
 *   { table: "agents", event: "UPDATE" },
 *   { table: "agent_health", event: "*" },
 * ], (table, payload) => {
 *   if (table === "agents") refreshAgents();
 *   if (table === "agent_health") refreshHealth();
 * });
 */
export function useRealtimeMulti(
  subscriptions: RealtimeSubscription[],
  onPayload: (table: string, payload: { new: unknown; old: unknown; eventType: string }) => void
) {
  const supabase = useSupabaseClient();
  const callbackRef = useRef(onPayload);
  callbackRef.current = onPayload;

  useEffect(() => {
    if (!supabase || subscriptions.length === 0) return;

    const channelName = `realtime:multi:${subscriptions.map((s) => s.table).join("+")}`;
    let channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      channel = channel.on(
        "postgres_changes" as "system",
        {
          event: sub.event || "*",
          schema: sub.schema || "public",
          table: sub.table,
          filter: sub.filter,
        } as Record<string, string | undefined>,
        (payload: Record<string, unknown>) => {
          callbackRef.current(sub.table, {
            new: payload.new,
            old: payload.old,
            eventType: payload.eventType as string,
          });
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, JSON.stringify(subscriptions)]);
}
