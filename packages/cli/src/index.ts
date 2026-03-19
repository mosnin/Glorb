#!/usr/bin/env node

import { login } from "./commands/login.js";
import { list } from "./commands/list.js";
import { pull } from "./commands/pull.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "login":
      await login(args.slice(1));
      break;
    case "list":
      await list(args.slice(1));
      break;
    case "pull":
      await pull(args.slice(1));
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      if (command) console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(command ? 1 : 0);
  }
}

function printHelp() {
  console.log(`
glorb - Glorb Agent Architecture Platform CLI

Usage: glorb <command> [options]

Commands:
  login <api-key>         Authenticate with your Glorb API key
  list [agents|clusters]  List your agents or clusters
  pull <type> <id>        Download an agent or cluster as a ZIP
  help                    Show this help message

Examples:
  glorb login glrb_abc123...
  glorb list agents
  glorb pull agent <agent-id>
  glorb pull cluster <cluster-id>
`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
