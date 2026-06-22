#!/usr/bin/env node

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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
const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "leanote-mcp" });
});

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer(client);

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[leanote-mcp] HTTP request error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

const port = Number(process.env.MCP_PORT ?? "3100");
const host = process.env.MCP_HOST ?? "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[leanote-mcp] HTTP server listening on http://${host}:${port}/mcp`);
});
