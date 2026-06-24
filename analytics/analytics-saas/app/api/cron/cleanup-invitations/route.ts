import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamInvitations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await db
      .delete(teamInvitations)
      .where(and(isNull(teamInvitations.acceptedAt), lt(teamInvitations.expiresAt, new Date())));

    return Response.json({
      success: true,
      deletedCount: deleted.rowCount,
      message: `Cleaned up ${deleted.rowCount || 0} expired invitations`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to cleanup invitations:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
