import * as fs from "node:fs";
import * as path from "node:path";
import { apiGet } from "../lib/api.js";

const VALID_FRAMEWORKS = ["claude-code", "cursor", "python", "raw"];

export async function init(args: string[]): Promise<void> {
  const framework = args[0];
  const agentId = args[1];

  if (!framework || !agentId) {
    console.error("Usage: glorb init <framework> <agent-id>");
    console.error(`Frameworks: ${VALID_FRAMEWORKS.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_FRAMEWORKS.includes(framework)) {
    console.error(`Invalid framework: ${framework}`);
    console.error(`Must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
    process.exit(1);
  }

  console.log(`Generating ${framework} adapter for agent ${agentId}...`);

  const { status, data } = await apiGet(
    `/agents/${agentId}/adapter?framework=${framework}`
  );

  if (status !== 200) {
    console.error(`Error: Server returned ${status}`);
    console.error(data);
    process.exit(1);
  }

  const adapter = data as {
    framework: string;
    files: Record<string, string>;
    instructions: string;
  };

  // Write all generated files
  for (const [filePath, content] of Object.entries(adapter.files)) {
    const fullPath = path.resolve(process.cwd(), filePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
    console.log(`  Created ${filePath}`);
  }

  console.log(`\n${adapter.instructions}`);
}
