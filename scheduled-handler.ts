/**
 * Cloudflare Workers scheduled event handler.
 * Replaces Vercel Cron — triggers /api/cron on the configured schedule.
 *
 * This file is referenced by @opennextjs/cloudflare when a `triggers.crons`
 * is defined in wrangler.jsonc. It performs a self-fetch to the cron endpoint
 * so the existing Next.js route logic is reused without duplication.
 */
export default {
  async scheduled(
    _event: ScheduledEvent,
    env: Record<string, string>,
    ctx: ExecutionContext
  ) {
    const baseUrl = env.SITE_URL || "http://localhost:3000";
    const cronSecret = env.CRON_SECRET || "";

    const url = `${baseUrl}/api/cron${cronSecret ? `?key=${cronSecret}` : ""}`;

    ctx.waitUntil(
      fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            console.error(`Cron fetch failed: ${res.status} ${await res.text()}`);
          }
        })
        .catch((err) => {
          console.error("Cron fetch error:", err);
        })
    );
  },
};
