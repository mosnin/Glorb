import * as fs from "node:fs";
import * as path from "node:path";
import { apiGet } from "../lib/api.js";

export async function manifest(args: string[]): Promise<void> {
  const type = args[0]; // "agent" or "cluster"
  const id = args[1];

  if (!type || !id || !["agent", "cluster"].includes(type)) {
    console.error("Usage: glorb manifest <agent|cluster> <id>");
    process.exit(1);
  }

  const endpoint = type === "agent"
    ? `/agents/${id}/manifest`
    : `/clusters/${id}/manifest`;

  console.log(`Fetching ${type} manifest...`);

  const { status, data } = await apiGet(endpoint);

  if (status !== 200) {
    console.error(`Error: Server returned ${status}`);
    console.error(data);
    process.exit(1);
  }

  const filename = `glorb-${type}-${id}.json`;
  const outPath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Manifest saved to ${outPath}`);
}
