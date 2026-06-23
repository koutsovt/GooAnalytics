import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";

export async function GET() {
  try {
    const userId = await requireSession();

    const configs = await db.query.reportConfigs.findMany({
      where: eq(reportConfigs.userId, userId),
    });

    return Response.json(configs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch configs:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireSession();
    const body = (await req.json()) as {
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

    const {
      ga4PropertyId,
      gscSiteUrl,
      gbpLocationId,
      recipientEmail,
      recipientPhone,
      scheduleFrequency,
      scheduleDayOfMonth,
      scheduleDayOfWeek,
      scheduleTime,
      scheduleTimezone,
    } = body;

    if (!gscSiteUrl) {
      return Response.json({ error: "gscSiteUrl is required" }, { status: 400 });
    }

    if (!recipientEmail) {
      return Response.json({ error: "recipientEmail is required" }, { status: 400 });
    }

    const id = `cfg_${userId}_${Date.now()}`;
    await db.insert(reportConfigs).values({
      id,
      userId,
      businessName: new URL(gscSiteUrl).hostname,
      ga4PropertyId,
      gscSiteUrl,
      gbpLocationId,
      recipientEmail,
      recipientPhone,
      scheduleFrequency: scheduleFrequency ?? "monthly",
      scheduleDayOfMonth: scheduleDayOfMonth ?? 1,
      scheduleDayOfWeek: scheduleDayOfWeek ?? 1,
      scheduleTime: scheduleTime ?? "09:00",
      scheduleTimezone: scheduleTimezone ?? "Australia/Sydney",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create config:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
