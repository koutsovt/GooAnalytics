import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { teamAuditLogs, teamMembers } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const userId = await requireSession();
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
    const pageLimit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam))) : 50;
    const offset = (page - 1) * pageLimit;

    const isTeamMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.memberId, userId),
    });

    if (isTeamMember) {
      return Response.json({ error: "Only owners can view audit logs" }, { status: 403 });
    }

    const ownerId = userId;

    const logs = await db.query.teamAuditLogs.findMany({
      where: eq(teamAuditLogs.ownerId, ownerId),
      orderBy: desc(teamAuditLogs.createdAt),
      limit: pageLimit + 1,
      offset,
    });

    const hasMore = logs.length > pageLimit;
    const items = logs.slice(0, pageLimit);

    return Response.json({
      items,
      page,
      hasMore,
      total: logs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to fetch audit logs:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
