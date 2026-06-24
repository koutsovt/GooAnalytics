import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/clients/resend";
import { sendWhatsApp } from "@/lib/clients/whatsapp";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";
import { EmailFormatter } from "@/lib/formatters/email.formatter";
import { JsonFormatter } from "@/lib/formatters/json.formatter";
import { SlackFormatter } from "@/lib/formatters/slack.formatter";
import { WhatsAppFormatter } from "@/lib/formatters/whatsapp.formatter";
import { logger } from "@/lib/logger";
import type { ReportOutput } from "@/lib/types/brief";

export async function deliverReport(
  reportId: string,
  userId: string,
  channels: ("email" | "whatsapp" | "slack" | "json")[],
): Promise<Record<string, string>> {
  // Scope by userId as well as id: defense-in-depth so the service never
  // delivers a report belonging to another account, even if a caller forgets
  // to authorize (the API route also checks ownership before enqueuing).
  const report = await db.query.reportHistory.findFirst({
    where: and(eq(reportHistory.id, reportId), eq(reportHistory.userId, userId)),
    with: { config: true },
  });

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  logger.debug(`Retrieved report ${reportId} for delivery`, { type: typeof report.reportData });

  let reportData: ReportOutput;
  try {
    if (typeof report.reportData === "string") {
      reportData = JSON.parse(report.reportData) as ReportOutput;
    } else {
      reportData = report.reportData as ReportOutput;
    }
  } catch (error) {
    throw new Error(
      `Failed to parse report data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!reportData?.actions) {
    throw new Error(`Report data is missing or incomplete`);
  }
  const config = report.config;
  const results: Record<string, string> = {};

  for (const channel of channels) {
    try {
      switch (channel) {
        case "json": {
          const formatted = await new JsonFormatter().format(reportData);
          results[channel] = formatted;
          logger.debug("Formatted report for JSON");
          break;
        }

        case "email": {
          if (!config?.recipientEmail) {
            throw new Error("No recipient email configured");
          }
          const html = await new EmailFormatter().format(reportData);
          await sendEmail(config.recipientEmail, reportData.subjectLine, html);
          results[channel] = `Email sent to ${config.recipientEmail}`;
          logger.debug("Email delivered", { recipient: config.recipientEmail });
          break;
        }

        case "whatsapp": {
          if (!config?.recipientPhone) {
            throw new Error("No recipient phone configured");
          }
          const text = await new WhatsAppFormatter().format(reportData);
          await sendWhatsApp(config.recipientPhone, text);
          results[channel] = `WhatsApp sent to ${config.recipientPhone}`;
          logger.debug("WhatsApp delivered", { recipient: config.recipientPhone });
          break;
        }

        case "slack": {
          const formatted = await new SlackFormatter().format(reportData);
          results[channel] = formatted;
          logger.debug("Formatted report for Slack");
          break;
        }

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results[channel] = `Error delivering to ${channel}: ${message}`;
      logger.warn(`Failed to deliver report to ${channel}`, { error: message });
    }
  }

  return results;
}
