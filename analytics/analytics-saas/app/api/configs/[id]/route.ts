import { eq } from "drizzle-orm";
import { canDeleteConfig, canEditConfig } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { updateConfigSchema } from "@/lib/validation";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireSession();
    const { id } = await params;

    const config = await db.query.reportConfigs.findFirst({
      where: eq(reportConfigs.id, id),
    });

    if (!config) {
      return Response.json({ error: "Config not found" }, { status: 404 });
    }

    const canEdit = await canEditConfig(userId, config.userId);
    if (!canEdit) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const parsed = updateConfigSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.businessName !== undefined) updates.businessName = body.businessName;
    if (body.ga4PropertyId !== undefined) updates.ga4PropertyId = body.ga4PropertyId;
    if (body.gscSiteUrl !== undefined) {
      updates.gscSiteUrl = body.gscSiteUrl;
      // The website changed, so a previously resolved Place ID may now point at
      // the wrong business. Clear it; report-time text search re-resolves the
      // correct listing (host-guarded) on the next run.
      if (body.gscSiteUrl !== config.gscSiteUrl) {
        updates.placeId = null;
      }
    }
    if (body.gbpLocationId !== undefined) updates.gbpLocationId = body.gbpLocationId;
    if (body.recipientEmail !== undefined) updates.recipientEmail = body.recipientEmail;
    if (body.recipientPhone !== undefined) updates.recipientPhone = body.recipientPhone;
    if (body.scheduleFrequency !== undefined) updates.scheduleFrequency = body.scheduleFrequency;
    if (body.scheduleDayOfMonth !== undefined) updates.scheduleDayOfMonth = body.scheduleDayOfMonth;
    if (body.scheduleDayOfWeek !== undefined) updates.scheduleDayOfWeek = body.scheduleDayOfWeek;
    if (body.scheduleTime !== undefined) updates.scheduleTime = body.scheduleTime;
    if (body.scheduleTimezone !== undefined) updates.scheduleTimezone = body.scheduleTimezone;

    await db.update(reportConfigs).set(updates).where(eq(reportConfigs.id, id));

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to update config:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireSession();
    const { id } = await params;

    const config = await db.query.reportConfigs.findFirst({
      where: eq(reportConfigs.id, id),
    });

    if (!config) {
      return Response.json({ error: "Config not found" }, { status: 404 });
    }

    const canDelete = await canDeleteConfig(userId, config.userId);
    if (!canDelete) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(reportConfigs).where(eq(reportConfigs.id, id));

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to delete config:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
