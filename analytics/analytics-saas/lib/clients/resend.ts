import { Resend } from "resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    logger.info(`[Resend] Sending email to ${to}, subject: ${subject}`);
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    logger.info(`[Resend] Email sent successfully, ID:`, result.data?.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[Resend] Failed to send email:`, message);
    throw new Error(`Failed to send email to ${to}: ${message}`);
  }
}
