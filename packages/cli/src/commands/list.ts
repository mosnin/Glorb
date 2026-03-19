import { apiGet } from "../lib/api.js";

export async function list(args: string[]): Promise<void> {
  const type = args[0] || "agents";

  if (type !== "agents" && type !== "clusters") {
    console.error("Usage: glorb list [agents|clusters]");
    process.exit(1);
  }

  const { status, data } = await apiGet(`/${type}`);

  if (status !== 200) {
    console.error("Error:", data);
    process.exit(1);
  }

  const items = data as { id: string; name: string; description?: string; status?: string }[];

  if (items.length === 0) {
    console.log(`No ${type} found.`);
    return;
  }

  // Table output
  const nameWidth = Math.max(4, ...items.map((i) => i.name.length));
  const header = `${"ID".padEnd(38)} ${"NAME".padEnd(nameWidth)} STATUS`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const item of items) {
    console.log(
      `${item.id.padEnd(38)} ${item.name.padEnd(nameWidth)} ${item.status || "draft"}`
    );
  }
}
