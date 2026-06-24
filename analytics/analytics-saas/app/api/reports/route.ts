import { logger } from "@/lib/logger";
import { and, eq, inArray } from "drizzle-orm";
import { canEditConfig } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";

export async function DELETE(req: Request) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);

    // Reports are derived from configs; gate deletion at edit level so viewers
    // can read history but only owners/admins/editors can remove it.
    const canDelete = await canEditConfig(userId, ownerId);
    if (!canDelete) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await req.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];

    if (ids.length === 0) {
      return Response.json({ error: "No report ids provided" }, { status: 400 });
    }

    // Scope the delete to the owner's own rows so crafted ids can never remove
    // another account's reports.
    const deleted = await db
      .delete(reportHistory)
      .where(and(eq(reportHistory.userId, ownerId), inArray(reportHistory.id, ids)))
      .returning({ id: reportHistory.id });

    return Response.json({ success: true, deleted: deleted.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to delete reports:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
