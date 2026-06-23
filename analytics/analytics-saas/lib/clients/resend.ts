import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    console.log(`[Resend] Sending email to ${to}, subject: ${subject}`);
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Resend] Email sent successfully, ID:`, result.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Resend] Failed to send email:`, message);
    throw new Error(`Failed to send email to ${to}: ${message}`);
  }
}
