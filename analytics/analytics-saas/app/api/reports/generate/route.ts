import { eq } from "drizzle-orm";
import { canEditConfig } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { reportQueue } from "@/lib/queue";
import type { ReportGenerationJob } from "@/lib/queue/types";
import { rateLimit } from "@/lib/rate-limit";

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

    // Generating a report consumes Google API quota and a paid LLM call, so it
    // is an edit-level action: owners/admins/editors only, never viewers. This
    // also rejects configs from another workspace (canEditConfig is false when
    // the caller is not a member of the config owner's team).
    if (!(await canEditConfig(userId, config.userId))) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Throttle per workspace owner to bound quota/LLM cost from rapid retries.
    const limit = await rateLimit(`reports:generate:${ownerId}`, 10, 60);
    if (!limit.ok) {
      return Response.json(
        { error: "Too many report requests. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limit.resetSeconds) } },
      );
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
    logger.error("Failed to enqueue report:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
