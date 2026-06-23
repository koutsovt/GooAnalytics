import { config as configDotenv } from "dotenv";
import { join } from "path";

configDotenv({ path: join(process.cwd(), ".env.local") });

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AnalyticsIQ MCP server connected");
}

main().catch(console.error);

process.on("SIGTERM", () => {
  console.error("SIGTERM received, shutting down");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.error("SIGINT received, shutting down");
  process.exit(0);
});
