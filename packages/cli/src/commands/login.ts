import { writeConfig, readConfig } from "../lib/config.js";
import { apiGet } from "../lib/api.js";

export async function login(args: string[]): Promise<void> {
  const apiKey = args[0];

  if (!apiKey) {
    console.error("Usage: glorb login <api-key>");
    process.exit(1);
  }

  if (!apiKey.startsWith("glrb_")) {
    console.error("Invalid API key format. Keys start with 'glrb_'");
    process.exit(1);
  }

  // Save key and validate
  const existing = readConfig();
  writeConfig({ ...existing, api_key: apiKey });

  try {
    const { status } = await apiGet("/agents");
    if (status === 401) {
      writeConfig({ ...existing, api_key: undefined });
      console.error("Invalid API key.");
      process.exit(1);
    }
    console.log("Authenticated successfully. Config saved to ~/.glorb/config.json");
  } catch (err) {
    writeConfig({ ...existing, api_key: undefined });
    console.error("Failed to validate key:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
