#!/usr/bin/env node

import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadLeanoteConfig } from "./config.js";
import {
  extractCredentialsFromHeaders,
  getLeanoteClient,
  hasCredentials,
  mergeCredentials,
} from "./auth.js";
import { createMcpServer } from "./mcp-server.js";

let serverConfig;

try {
  serverConfig = loadLeanoteConfig({ requireCredentials: false });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[leanote-mcp] Configuration error: ${message}`);
  process.exit(1);
}

if (hasCredentials(serverConfig)) {
  console.error(
    "[leanote-mcp] Server config must only provide baseUrl (config file or LEANOTE_BASE_URL); user credentials belong in Cursor headers.",
  );
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "4mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "leanote-mcp",
  });
});

app.all("/mcp", async (req, res) => {
  const userConfig = mergeCredentials(
    serverConfig,
    extractCredentialsFromHeaders(req.headers),
  );

  if (!userConfig) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          "Leanote credentials required. Pass Authorization: Bearer <token>, or X-Leanote-Email and X-Leanote-Password headers.",
      },
      id: null,
    });
    return;
  }

  const client = getLeanoteClient(userConfig);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer(client);

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  const parsedBody = req.method === "POST" ? req.body : undefined;

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
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
  console.log(
    `[leanote-mcp] HTTP server listening on http://${host}:${port}/mcp`,
  );
});
