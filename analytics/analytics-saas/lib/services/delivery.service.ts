import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/clients/resend";
import { sendWhatsApp } from "@/lib/clients/whatsapp";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";
import { EmailFormatter } from "@/lib/formatters/email.formatter";
import { JsonFormatter } from "@/lib/formatters/json.formatter";
import { SlackFormatter } from "@/lib/formatters/slack.formatter";
import { WhatsAppFormatter } from "@/lib/formatters/whatsapp.formatter";
import type { ReportOutput } from "@/lib/types/brief";

export async function deliverReport(
  reportId: string,
  userId: string,
  channels: ("email" | "whatsapp" | "slack" | "json")[],
): Promise<Record<string, string>> {
  const report = await db.query.reportHistory.findFirst({
    where: eq(reportHistory.id, reportId),
    with: { config: true },
  });

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  console.log(`[Delivery] Retrieved report ${reportId}, data type:`, typeof report.reportData);

  let reportData: ReportOutput;
  try {
    if (typeof report.reportData === "string") {
      reportData = JSON.parse(report.reportData) as ReportOutput;
    } else {
      reportData = report.reportData as ReportOutput;
    }
  } catch (error) {
    throw new Error(`Failed to parse report data: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!reportData || !reportData.actions) {
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
          console.log(`✓ Formatted report for JSON`);
          break;
        }

        case "email": {
          if (!config?.recipientEmail) {
            throw new Error("No recipient email configured");
          }
          const html = await new EmailFormatter().format(reportData);
          await sendEmail(config.recipientEmail, reportData.subjectLine, html);
          results[channel] = `Email sent to ${config.recipientEmail}`;
          console.log(`✓ Email sent to ${config.recipientEmail}`);
          break;
        }

        case "whatsapp": {
          if (!config?.recipientPhone) {
            throw new Error("No recipient phone configured");
          }
          const text = await new WhatsAppFormatter().format(reportData);
          await sendWhatsApp(config.recipientPhone, text);
          results[channel] = `WhatsApp sent to ${config.recipientPhone}`;
          console.log(`✓ WhatsApp sent to ${config.recipientPhone}`);
          break;
        }

        case "slack": {
          const formatted = await new SlackFormatter().format(reportData);
          results[channel] = formatted;
          console.log(`✓ Formatted report for Slack`);
          break;
        }

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results[channel] = `Error delivering to ${channel}: ${message}`;
      console.error(`✗ Failed to deliver report to ${channel}:`, message);
    }
  }

  return results;
}
