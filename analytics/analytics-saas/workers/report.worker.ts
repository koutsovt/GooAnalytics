import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { generateBrief } from "@/lib/clients/anthropic";
import { generateBriefWithGLM } from "@/lib/clients/glm";
import { db, isUniqueConstraintViolation } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue/connection";
import { deliveryQueue } from "@/lib/queue/queues";
import { parseDeliveryChannels, type ReportGenerationJob } from "@/lib/queue/types";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";
import { getPriorReport } from "@/lib/services/report.service";

const connection = getRedisConnection();

// Scheduled (cron) runs have no one watching the dashboard to click
// "Deliver", so a successful cron generation auto-enqueues its own delivery
// using the config's saved channels. A delivery-enqueue failure here must
// never flip an already-successful report to "failed" — it's logged and
// swallowed so the client can still retry delivery manually from the
// dashboard.
async function autoDeliverIfCron(
  job: Job<ReportGenerationJob>,
  config: typeof reportConfigs.$inferSelect,
  reportId: string,
) {
  if (job.data.trigger !== "cron") return;

  const channels = parseDeliveryChannels(config.activeChannels);
  try {
    await deliveryQueue.add(
      `delivery-${reportId}-${Date.now()}`,
      { reportId, userId: config.userId, channels },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: false },
    );
    job.log(`Auto-delivery queued for channels: ${channels.join(", ")}`);
    logger.info("Auto-delivery queued for cron report", { reportId, channels });
  } catch (error) {
    logger.error("Failed to auto-queue delivery for cron report", { reportId, error });
  }
}

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
        config.businessType ?? undefined,
        config.scheduleTimezone ?? undefined,
      );

      // Loop-closing context from last month, fetched before we insert this one.
      const prior = await getPriorReport(configId);

      job.log(`Generating brief with ${model}...`);
      const brief =
        model === "glm"
          ? await generateBriefWithGLM(analyticsData, prior)
          : await generateBrief(analyticsData, prior);

      job.log("Storing report in history...");
      const period = `${periodStart}_to_${periodEnd}`;
      const reportId = `rpt_${userId}_${Date.now()}`;

      logger.debug("Saving report to history", { reportId });

      try {
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
      } catch (insertError) {
        // Two overlapping/duplicate job triggers for the same config+period
        // race to insert; the unique (configId, period) index rejects the
        // loser. That's not a failure — the report already exists — so log
        // and move on instead of failing the whole job.
        if (isUniqueConstraintViolation(insertError)) {
          logger.warn("Report already exists for this config and period, skipping", {
            configId,
            period,
          });
          return { reportId, status: "skipped-duplicate" };
        }
        throw insertError;
      }

      logger.info("Report saved", { reportId });

      await autoDeliverIfCron(job, config, reportId);

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
        try {
          await db.insert(reportHistory).values({
            id: `rpt_${userId}_${Date.now()}`,
            userId,
            configId,
            period: `${periodStart}_to_${periodEnd}`,
            status: "error",
            errorMessage: message,
            createdAt: new Date(),
          });
        } catch (insertError) {
          if (isUniqueConstraintViolation(insertError)) {
            logger.warn("Report history row already exists for this config and period, skipping", {
              configId,
              period: `${periodStart}_to_${periodEnd}`,
            });
          } else {
            throw insertError;
          }
        }
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
