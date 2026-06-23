import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";
import { reportQueue } from "@/lib/queue";

const server = new Server({
  name: "AnalyticsIQ",
  version: "1.0.0",
});

const tools: Tool[] = [
  {
    name: "get_latest_report",
    description: "Get the most recent analytics report for a property or user",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description:
            "Optional: specific config ID. If omitted, returns user's first config's latest report",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_report",
    description: "Enqueue a new report generation job",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Property config ID",
        },
        period_start: {
          type: "string",
          description: "Start date in YYYY-MM-DD format",
        },
        period_end: {
          type: "string",
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["config_id", "period_start", "period_end"],
    },
  },
  {
    name: "get_analytics_overview",
    description: "Get high-level overview of latest report data (sessions, impressions, etc)",
    inputSchema: {
      type: "object",
      properties: {
        config_id: {
          type: "string",
          description: "Optional: specific config ID. If omitted, uses user's first config",
        },
      },
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_latest_report") {
    const configId = (args?.config_id as string) || undefined;

    let report;
    if (configId) {
      report = await db.query.reportHistory.findFirst({
        where: eq(reportHistory.configId, configId),
        orderBy: desc(reportHistory.createdAt),
      });
    } else {
      const config = await db.query.reportConfigs.findFirst({
        orderBy: desc(reportConfigs.createdAt),
      });
      if (config) {
        report = await db.query.reportHistory.findFirst({
          where: eq(reportHistory.configId, config.id),
          orderBy: desc(reportHistory.createdAt),
        });
      }
    }

    if (!report) {
      return { content: [{ type: "text", text: "No report found" }] };
    }

    const data = report.reportData;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              period: report.period,
              subjectLine: data?.subjectLine,
              summary: data?.summary,
              actions: data?.actions,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (name === "generate_report") {
    const configId = args?.config_id as string;
    const periodStart = args?.period_start as string;
    const periodEnd = args?.period_end as string;

    if (!configId || !periodStart || !periodEnd) {
      return {
        content: [
          { type: "text", text: "Missing required arguments: config_id, period_start, period_end" },
        ],
      };
    }

    const config = await db.query.reportConfigs.findFirst({
      where: eq(reportConfigs.id, configId),
    });

    if (!config) {
      return { content: [{ type: "text", text: "Config not found" }] };
    }

    const job = await reportQueue.add(
      `mcp-${configId}-${Date.now()}`,
      {
        userId: config.userId,
        configId,
        periodStart,
        periodEnd,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: false,
      },
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              jobId: job.id,
              status: "queued",
              message: "Report generation job enqueued",
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (name === "get_analytics_overview") {
    const configId = (args?.config_id as string) || undefined;

    let report;
    if (configId) {
      report = await db.query.reportHistory.findFirst({
        where: eq(reportHistory.configId, configId),
        orderBy: desc(reportHistory.createdAt),
      });
    } else {
      const config = await db.query.reportConfigs.findFirst({
        orderBy: desc(reportConfigs.createdAt),
      });
      if (config) {
        report = await db.query.reportHistory.findFirst({
          where: eq(reportHistory.configId, config.id),
          orderBy: desc(reportHistory.createdAt),
        });
      }
    }

    if (!report || !report.rawData) {
      return { content: [{ type: "text", text: "No data available" }] };
    }

    const rawData = report.rawData;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              period: report.period,
              sessions: rawData.website?.sessions ?? 0,
              impressions: rawData.search?.impressions ?? 0,
              interactions: rawData.local?.totalInteractions ?? 0,
              rating: rawData.reputation?.averageRating ?? 0,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
});

export { server };
