import { config as configDotenv } from "dotenv";
import { join } from "path";

configDotenv({ path: join(process.cwd(), ".env.local") });

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";

// An MCP stdio server speaks JSON-RPC over stdout, so all diagnostics MUST go
// to stderr — hence console.error directly here rather than the shared logger
// (which routes info/debug to stdout and would corrupt the protocol stream).
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AnalyticsIQ MCP server connected");
}

main().catch((error) => {
  console.error("MCP server failed to start", error);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.error("SIGTERM received, shutting down");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.error("SIGINT received, shutting down");
  process.exit(0);
});
