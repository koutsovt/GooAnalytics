import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { teamInvitations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { logTeamAudit } from "@/lib/services/audit.service";

async function sendInvitationEmail(email: string, acceptUrl: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: email,
        subject: "You've been invited to AnalyticsIQ",
        html: `
          <p>You've been invited to join AnalyticsIQ to view analytics reports.</p>
          <p><a href="${acceptUrl}">Accept Invitation</a></p>
          <p>This invitation expires in 7 days.</p>
        `,
      }),
    });

    if (!response.ok) {
      logger.error("Failed to send email:", await response.text());
      throw new Error("Failed to send invitation email");
    }
  } catch (error) {
    logger.error("Email send error:", error);
    throw error;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ invId: string }> }) {
  try {
    const userId = await requireSession();
    const { invId } = await params;

    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.id, invId),
    });

    if (!invitation) {
      return Response.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.ownerId !== userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (invitation.acceptedAt) {
      return Response.json({ error: "Invitation already accepted" }, { status: 400 });
    }

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db
      .update(teamInvitations)
      .set({ expiresAt: newExpiresAt })
      .where(eq(teamInvitations.id, invId));

    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/team/accept?token=${invitation.token}`;
    await sendInvitationEmail(invitation.inviteeEmail, acceptUrl);

    await logTeamAudit(invitation.ownerId, "team_invite_resent", userId, invitation.inviteeEmail);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to resend invitation:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
