import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { reportQueue } from "@/lib/queue";

function shouldRunNow(config: typeof reportConfigs.$inferSelect, now: Date): boolean {
  const tzStr = config.scheduleTimezone ?? "UTC";
  const [schedHour] = (config.scheduleTime ?? "09:00").split(":").map(Number);

  // Get local date/time in the config's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzStr,
    hour: "2-digit",
    day: "2-digit",
    weekday: "long",
  });

  const parts: Record<string, string> = {};
  formatter.formatToParts(now).forEach(({ type, value }) => {
    parts[type] = value;
  });

  const hour = Number(parts.hour?.replace(/\D/g, ""));
  const day = Number(parts.day);

  // Map weekday names to 0-6 (0 = Sunday)
  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const weekday = weekdayMap[parts.weekday?.toLowerCase() ?? "sunday"] ?? 0;

  if (hour !== schedHour) return false;

  if (config.scheduleFrequency === "weekly") {
    return weekday === (config.scheduleDayOfWeek ?? 1);
  }
  return day === (config.scheduleDayOfMonth ?? 1);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await db.query.reportConfigs.findMany({
      where: eq(reportConfigs.subscriptionActive, true),
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const periodStart = thirtyDaysAgo.toISOString().split("T")[0];
    const periodEnd = now.toISOString().split("T")[0];

    let queued = 0;
    let skipped = 0;

    for (const config of configs) {
      if (!shouldRunNow(config, now)) {
        skipped++;
        continue;
      }

      try {
        await reportQueue.add(
          `cron-${config.id}-${Date.now()}`,
          {
            userId: config.userId,
            configId: config.id,
            periodStart,
            periodEnd,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: false,
          },
        );
        queued++;
      } catch (error) {
        console.error(`Failed to queue report for config ${config.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      queued,
      skipped,
      total: configs.length,
      message: `Queued ${queued}/${configs.length} reports (${skipped} skipped by schedule)`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron job failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
