import crypto from "crypto";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/permissions";
import { logTeamAudit } from "@/lib/services/audit.service";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers } from "@/lib/db/schema";
import { env } from "@/lib/env";

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
      console.error("Failed to send email:", await response.text());
      throw new Error("Failed to send invitation email");
    }
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireSession();
    const body = (await req.json()) as {
      email: string;
      role?: "viewer" | "editor" | "admin";
    };

    if (!body.email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const isTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });

    if (isTeamMember) {
      return Response.json({ error: "Team members cannot invite other users" }, { status: 403 });
    }

    const ownerId = userId;

    const token = crypto.randomBytes(32).toString("hex");
    const id = `inv_${ownerId}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(teamInvitations).values({
      id,
      ownerId,
      inviteeEmail: body.email,
      role: body.role ?? "viewer",
      token,
      expiresAt,
    });

    const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/api/team/accept?token=${token}`;
    await sendInvitationEmail(body.email, acceptUrl);

    await logTeamAudit(ownerId, "team_invite_sent", userId, body.email, undefined, {
      role: body.role ?? "viewer",
    });

    return Response.json({ success: true, invitationId: id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send invitation:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
