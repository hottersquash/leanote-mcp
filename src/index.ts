#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LeanoteClient } from "./leanote-client.js";
import { loadLeanoteConfig } from "./config.js";
import { createMcpServer } from "./mcp-server.js";

let client: LeanoteClient;

try {
  client = new LeanoteClient(loadLeanoteConfig());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[leanote-mcp] Configuration error: ${message}`);
  process.exit(1);
}

const server = createMcpServer(client);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[leanote-mcp] Fatal error:", error);
  process.exit(1);
});
