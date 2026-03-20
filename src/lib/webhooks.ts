import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type WebhookEvent =
  | "agent.run.started"
  | "agent.run.completed"
  | "agent.run.failed"
  | "cluster.run.started"
  | "cluster.run.completed"
  | "cluster.run.failed"
  | "agent.file.updated"
  | "agent.config.updated"
  | "agent.memory.updated"
  | "test.run.completed";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "agent.run.started", label: "Agent Run Started" },
  { value: "agent.run.completed", label: "Agent Run Completed" },
  { value: "agent.run.failed", label: "Agent Run Failed" },
  { value: "cluster.run.started", label: "Cluster Run Started" },
  { value: "cluster.run.completed", label: "Cluster Run Completed" },
  { value: "cluster.run.failed", label: "Cluster Run Failed" },
  { value: "agent.file.updated", label: "Agent File Updated" },
  { value: "agent.config.updated", label: "Agent Config Updated" },
  { value: "agent.memory.updated", label: "Agent Memory Updated" },
  { value: "test.run.completed", label: "Test Run Completed" },
];

export async function dispatchWebhook(
  userId: string,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
) {
  const supabase = createAdminSupabaseClient();

  // Find active webhooks for this user that subscribe to this event
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .contains("events", [eventType]);

  if (!webhooks || webhooks.length === 0) return;

  for (const webhook of webhooks) {
    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    // Create HMAC signature
    const signature = webhook.secret
      ? crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")
      : undefined;

    // Create delivery record
    const { data: delivery } = await supabase
      .from("webhook_deliveries")
      .insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: { event: eventType, data: payload },
      })
      .select()
      .single();

    // Fire-and-forget delivery
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Glorb-Event": eventType,
      };
      if (signature) headers["X-Glorb-Signature"] = `sha256=${signature}`;

      const res = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      await supabase
        .from("webhook_deliveries")
        .update({
          status_code: res.status,
          response_body: (await res.text()).slice(0, 1000),
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery?.id);
    } catch (err) {
      // Schedule retry
      const retryAt = new Date(Date.now() + 60000).toISOString();
      await supabase
        .from("webhook_deliveries")
        .update({
          status_code: 0,
          response_body: err instanceof Error ? err.message : "Delivery failed",
          next_retry_at: retryAt,
        })
        .eq("id", delivery?.id);
    }
  }
}
