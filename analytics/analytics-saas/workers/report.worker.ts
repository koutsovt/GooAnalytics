import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { generateBrief } from "@/lib/clients/anthropic";
import { generateBriefWithGLM } from "@/lib/clients/glm";
import { db } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue/connection";
import type { ReportGenerationJob } from "@/lib/queue/types";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";

const connection = getRedisConnection();

export const reportWorker = new Worker<ReportGenerationJob>(
  "reports",
  async (job: Job<ReportGenerationJob>) => {
    const { userId, configId, periodStart, periodEnd, model = "glm" } = job.data;

    try {
      job.log("Fetching report config...");
      const config = await db.query.reportConfigs.findFirst({
        where: eq(reportConfigs.id, configId),
      });

      if (!config) {
        throw new Error(`Report config ${configId} not found`);
      }

      if (!config.gscSiteUrl) {
        throw new Error("Website URL is required to generate a report");
      }

      job.log("Getting valid OAuth tokens...");
      const tokens = await getValidTokens(userId);

      job.log("Fetching analytics data...");
      const analyticsData = await fetchAnalyticsData(
        config.businessName,
        config.ga4PropertyId ?? undefined,
        config.gscSiteUrl,
        config.gbpLocationId ?? undefined,
        tokens,
        periodStart,
        periodEnd,
        config.placeId ?? undefined,
      );

      job.log(`Generating brief with ${model}...`);
      const brief =
        model === "glm"
          ? await generateBriefWithGLM(analyticsData)
          : await generateBrief(analyticsData);

      job.log("Storing report in history...");
      const period = `${periodStart}_to_${periodEnd}`;
      const reportId = `rpt_${userId}_${Date.now()}`;

      logger.debug("Saving report to history", { reportId });

      await db.insert(reportHistory).values({
        id: reportId,
        userId,
        configId,
        period,
        status: "success",
        reportData: brief,
        rawData: analyticsData,
        createdAt: new Date(),
      });

      logger.info("Report saved", { reportId });

      job.log("Report generation complete");
      return { reportId, status: "success" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      job.log(`Error: ${message}`);

      // BullMQ retries this job up to job.opts.attempts times. Inside the
      // processor, attemptsMade is 0-based for the current run (it is incremented
      // later, in moveToFailed), so the current run is the final one when
      // attemptsMade + 1 >= attempts. Only persist the error row then, otherwise
      // a single failing report writes one row per retry (3 duplicates by default).
      const maxAttempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

      if (isFinalAttempt) {
        await db.insert(reportHistory).values({
          id: `rpt_${userId}_${Date.now()}`,
          userId,
          configId,
          period: `${periodStart}_to_${periodEnd}`,
          status: "error",
          errorMessage: message,
          createdAt: new Date(),
        });
      }

      throw error;
    }
  },
  { connection },
);

reportWorker.on("completed", (job) => {
  logger.info(`✓ Report job ${job.id} completed`);
});

reportWorker.on("failed", (job, err) => {
  logger.error(`✗ Report job ${job?.id} failed:`, err instanceof Error ? err.message : err);
});
