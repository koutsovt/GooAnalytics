import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { logTeamAudit } from "@/lib/services/audit.service";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const userId = await requireSession();
    const { memberId } = await params;
    const body = (await req.json()) as { role: "viewer" | "editor" | "admin" };

    if (!body.role || !["viewer", "editor", "admin"].includes(body.role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    const isTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });

    if (isTeamMember) {
      return Response.json({ error: "Only owners can change roles" }, { status: 403 });
    }

    const ownerId = userId;

    const member = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.ownerId, ownerId), eq(teamMembers.memberId, memberId)),
    });

    if (!member) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    const oldRole = member.role;
    await db.update(teamMembers).set({ role: body.role }).where(eq(teamMembers.id, member.id));

    await logTeamAudit(ownerId, "team_member_role_changed", userId, undefined, memberId, {
      oldRole,
      newRole: body.role,
    });

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to change member role:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
