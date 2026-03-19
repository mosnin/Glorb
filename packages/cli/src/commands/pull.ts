import * as fs from "node:fs";
import * as path from "node:path";
import { apiGetBuffer } from "../lib/api.js";

export async function pull(args: string[]): Promise<void> {
  const type = args[0]; // "agent" or "cluster"
  const id = args[1];

  if (!type || !id || !["agent", "cluster"].includes(type)) {
    console.error("Usage: glorb pull <agent|cluster> <id>");
    process.exit(1);
  }

  const endpoint = type === "agent" ? `/agents/${id}/export` : `/clusters/${id}/export`;

  console.log(`Downloading ${type} ${id}...`);

  const { status, data } = await apiGetBuffer(endpoint);

  if (status !== 200) {
    console.error(`Error: Server returned ${status}`);
    process.exit(1);
  }

  const filename = `${type}-${id}.zip`;
  const outPath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(outPath, data);
  console.log(`Saved to ${outPath} (${data.length} bytes)`);
}
