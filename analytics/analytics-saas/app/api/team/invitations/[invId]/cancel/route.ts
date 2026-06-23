import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { logTeamAudit } from "@/lib/services/audit.service";
import { db } from "@/lib/db";
import { teamInvitations } from "@/lib/db/schema";

export async function DELETE(_req: Request, { params }: { params: Promise<{ invId: string }> }) {
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
      return Response.json({ error: "Cannot cancel accepted invitation" }, { status: 400 });
    }

    await db.delete(teamInvitations).where(eq(teamInvitations.id, invId));

    await logTeamAudit(
      invitation.ownerId,
      "team_invite_cancelled",
      userId,
      invitation.inviteeEmail,
    );

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to cancel invitation:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
