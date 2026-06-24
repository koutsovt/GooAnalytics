import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { logTeamAudit } from "@/lib/services/audit.service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const userId = await requireSession();
    const { memberId } = await params;

    const isTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });

    if (isTeamMember) {
      return Response.json({ error: "Only team owners can remove members" }, { status: 403 });
    }

    const ownerId = userId;
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.memberId, memberId)));

    await logTeamAudit(ownerId, "team_member_removed", userId, undefined, memberId);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to remove member:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
