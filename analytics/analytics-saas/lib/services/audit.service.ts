import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamAuditLogs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export type AuditAction =
  | "team_invite_sent"
  | "team_invite_accepted"
  | "team_invite_resent"
  | "team_invite_cancelled"
  | "team_member_removed"
  | "team_member_role_changed";

export async function logTeamAudit(
  ownerId: string,
  action: AuditAction,
  actorId: string,
  targetEmail?: string,
  targetMemberId?: string,
  details?: Record<string, unknown>,
) {
  try {
    const id = `audit_${ownerId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db.insert(teamAuditLogs).values({
      id,
      ownerId,
      action,
      actorId,
      targetEmail,
      targetMemberId,
      details,
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error("Failed to log audit event:", error);
  }
}

export async function getTeamAuditLogs(ownerId: string, limit: number = 50) {
  try {
    return await db.query.teamAuditLogs.findMany({
      where: eq(teamAuditLogs.ownerId, ownerId),
      limit,
      orderBy: desc(teamAuditLogs.createdAt),
    });
  } catch (error) {
    logger.error("Failed to fetch audit logs:", error);
    return [];
  }
}
