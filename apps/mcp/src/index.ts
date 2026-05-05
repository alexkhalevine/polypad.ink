#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "polypad",
    version: "0.1.0",
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the MCP protocol channel — log to stderr only.
  console.error("polypad MCP server ready (stdio)");
}

main().catch((err) => {
  console.error("polypad MCP server failed:", err);
  process.exit(1);
});
