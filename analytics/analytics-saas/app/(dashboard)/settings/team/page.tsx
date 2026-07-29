import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TeamPageContent } from "@/components/dashboard/team-page-content";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers } from "@/lib/db/schema";

export default async function TeamPage() {
  const userId = await requireSession();
  const ownerUserId = await resolveOwner(userId);

  if (ownerUserId !== userId) {
    redirect("/dashboard");
  }

  const [members, invitations] = await Promise.all([
    db.query.teamMembers.findMany({
      where: eq(teamMembers.ownerId, userId),
      with: { member: true },
    }),
    db.query.teamInvitations.findMany({
      where: eq(teamInvitations.ownerId, userId),
    }),
  ]);

  return <TeamPageContent initialMembers={members} initialInvitations={invitations} />;
}
