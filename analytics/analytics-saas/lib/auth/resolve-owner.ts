import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/db/schema";

/**
 * Returns the ownerId for data queries.
 * If the current user is a team member, returns their owner's userId.
 * Otherwise returns the userId as-is.
 */
export async function resolveOwner(userId: string): Promise<string> {
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.memberId, userId),
  });
  return membership?.ownerId ?? userId;
}
