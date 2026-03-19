import { apiGet, apiPost } from "../lib/api.js";

export async function sync(args: string[]): Promise<void> {
  const subcommand = args[0]; // "report", "feed", "cluster-feed"
  const id = args[1];

  switch (subcommand) {
    case "report": {
      if (!id) {
        console.error("Usage: glorb sync report <agent-id> [event-type] [message]");
        process.exit(1);
      }
      const eventType = args[2] || "heartbeat";
      const message = args[3] || "CLI sync";

      const { status, data } = await apiPost(`/agents/${id}/sync`, {
        event_type: eventType,
        source_framework: "cli",
        payload: { message },
      });

      if (status !== 201) {
        console.error(`Error: Server returned ${status}`);
        console.error(data);
        process.exit(1);
      }

      console.log("Event reported successfully.");
      break;
    }

    case "feed": {
      if (!id) {
        console.error("Usage: glorb sync feed <agent-id> [limit]");
        process.exit(1);
      }
      const limit = args[2] || "20";
      const { status, data } = await apiGet(`/agents/${id}/sync?limit=${limit}`);

      if (status !== 200) {
        console.error(`Error: Server returned ${status}`);
        console.error(data);
        process.exit(1);
      }

      const events = data as Array<{
        event_type: string;
        source_framework: string;
        payload: Record<string, unknown>;
        created_at: string;
      }>;

      if (events.length === 0) {
        console.log("No activity yet.");
        return;
      }

      console.log(`Recent activity for agent ${id}:\n`);
      for (const evt of events) {
        const time = new Date(evt.created_at).toLocaleString();
        const msg = evt.payload?.message || JSON.stringify(evt.payload);
        console.log(`  [${time}] ${evt.source_framework} | ${evt.event_type}: ${msg}`);
      }
      break;
    }

    case "cluster-feed": {
      if (!id) {
        console.error("Usage: glorb sync cluster-feed <cluster-id>");
        process.exit(1);
      }
      const { status, data } = await apiGet(`/clusters/${id}/sync?type=all`);

      if (status !== 200) {
        console.error(`Error: Server returned ${status}`);
        console.error(data);
        process.exit(1);
      }

      const result = data as {
        events?: Array<{
          event_type: string;
          source_framework: string;
          agent?: { name: string };
          created_at: string;
        }>;
        context_docs?: Array<{
          title: string;
          doc_type: string;
          created_at: string;
        }>;
      };

      if (result.context_docs?.length) {
        console.log("Context Documents:");
        for (const doc of result.context_docs) {
          console.log(`  - ${doc.title} (${doc.doc_type}) — ${new Date(doc.created_at).toLocaleString()}`);
        }
        console.log();
      }

      if (result.events?.length) {
        console.log("Recent Events:");
        for (const evt of result.events) {
          const time = new Date(evt.created_at).toLocaleString();
          const agent = evt.agent?.name || "unknown";
          console.log(`  [${time}] ${agent} via ${evt.source_framework} | ${evt.event_type}`);
        }
      }

      if (!result.events?.length && !result.context_docs?.length) {
        console.log("No cluster activity yet.");
      }
      break;
    }

    default:
      console.error(`Usage: glorb sync <report|feed|cluster-feed> <id> [options]

Commands:
  report <agent-id> [event-type] [message]   Report an event
  feed <agent-id> [limit]                     View agent activity feed
  cluster-feed <cluster-id>                   View cluster-wide activity
`);
      process.exit(1);
  }
}
