import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { canDeleteConfig, canEditConfig } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";

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

    const body = (await req.json()) as {
      businessName?: string;
      ga4PropertyId?: string;
      gscSiteUrl?: string;
      gbpLocationId?: string;
      recipientEmail?: string;
      recipientPhone?: string;
      scheduleFrequency?: string;
      scheduleDayOfMonth?: number;
      scheduleDayOfWeek?: number;
      scheduleTime?: string;
      scheduleTimezone?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.businessName !== undefined) updates.businessName = body.businessName;
    if (body.ga4PropertyId !== undefined) updates.ga4PropertyId = body.ga4PropertyId;
    if (body.gscSiteUrl !== undefined) updates.gscSiteUrl = body.gscSiteUrl;
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
    console.error("Failed to update config:", message);
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
    console.error("Failed to delete config:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
