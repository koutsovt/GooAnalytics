import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { reportQueue } from "@/lib/queue";
import type { ReportGenerationJob } from "@/lib/queue/types";

export async function POST(req: Request) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);
    const body = (await req.json()) as Omit<ReportGenerationJob, "userId">;
    const { configId, periodStart, periodEnd, model = "glm" } = body;

    if (!configId || !periodStart || !periodEnd) {
      return Response.json(
        {
          error: "Missing required fields: configId, periodStart, periodEnd",
        },
        { status: 400 },
      );
    }

    if (model && !["claude", "glm"].includes(model)) {
      return Response.json(
        {
          error: "Invalid model. Must be 'claude' or 'glm'",
        },
        { status: 400 },
      );
    }

    const config = await db.query.reportConfigs.findFirst({
      where: eq(reportConfigs.id, configId),
    });

    if (!config) {
      return Response.json({ error: "Config not found" }, { status: 404 });
    }

    if (config.userId !== ownerId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const job = await reportQueue.add(
      `report-${ownerId}-${Date.now()}`,
      {
        userId: ownerId,
        configId,
        periodStart,
        periodEnd,
        model,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: false,
      },
    );

    return Response.json(
      {
        success: true,
        jobId: job.id,
        status: "queued",
        message: "Report generation job enqueued",
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to enqueue report:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
