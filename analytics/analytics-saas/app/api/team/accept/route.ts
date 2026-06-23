import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth/session";
import { logTeamAudit } from "@/lib/services/audit.service";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers, users } from "@/lib/db/schema";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return redirect("/login?error=missing_token");
  }

  try {
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return redirect("/login?error=invalid_token");
    }

    if (invitation.acceptedAt) {
      return redirect("/login?error=already_accepted");
    }

    if (invitation.expiresAt < new Date()) {
      return redirect("/login?error=expired");
    }

    let invitee = await db.query.users.findFirst({
      where: eq(users.email, invitation.inviteeEmail),
    });

    if (!invitee) {
      const newUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.insert(users).values({
        id: newUserId,
        email: invitation.inviteeEmail,
        createdAt: new Date(),
      });
      invitee = {
        id: newUserId,
        email: invitation.inviteeEmail,
        name: null,
        createdAt: new Date(),
      };
    }

    const existing = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, invitee.id),
    });

    if (!existing) {
      const memId = `mem_${invitation.ownerId}_${Date.now()}`;
      await db.insert(teamMembers).values({
        id: memId,
        ownerId: invitation.ownerId,
        memberId: invitee.id,
        role: invitation.role ?? "viewer",
      });

      await logTeamAudit(
        invitation.ownerId,
        "team_invite_accepted",
        invitee.id,
        invitation.inviteeEmail,
        invitee.id,
        { role: invitation.role ?? "viewer" },
      );
    }

    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.token, token));

    await setSessionCookie(invitee.id);
    return redirect("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to accept invitation:", message);
    return redirect(`/login?error=${encodeURIComponent(message)}`);
  }
}
