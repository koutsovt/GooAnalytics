import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers } from "@/lib/db/schema";

export async function GET() {
  try {
    const userId = await requireSession();
    const ownerId = userId;

    const isTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });

    if (isTeamMember) {
      return Response.json({ error: "Only team owners can view team members" }, { status: 403 });
    }

    const [members, invitations] = await Promise.all([
      db.query.teamMembers.findMany({
        where: eq(teamMembers.ownerId, ownerId),
        with: { member: true },
      }),
      db.query.teamInvitations.findMany({
        where: eq(teamInvitations.ownerId, ownerId),
      }),
    ]);

    return Response.json({ members, invitations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch team members:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
