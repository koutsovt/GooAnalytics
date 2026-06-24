import { type Job, Worker } from "bullmq";
import { logger } from "@/lib/logger";
import { getRedisConnection } from "@/lib/queue/connection";
import type { ReportDeliveryJob } from "@/lib/queue/types";
import { deliverReport } from "@/lib/services/delivery.service";

const connection = getRedisConnection();

export const deliveryWorker = new Worker<ReportDeliveryJob>(
  "delivery",
  async (job: Job<ReportDeliveryJob>) => {
    try {
      const { reportId, userId, channels } = job.data;

      job.log(`Delivering report ${reportId} to channels: ${channels.join(", ")}`);
      logger.debug("Starting delivery", { reportId, channels });

      const results = await deliverReport(reportId, userId, channels);
      logger.debug("Delivery complete", { reportId });

      job.log("Delivery processing complete");
      return { reportId, results, status: "success" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Delivery worker error", error);
      job.log(`Error: ${message}`);
      throw error;
    }
  },
  { connection },
);

deliveryWorker.on("completed", (job) => {
  logger.info(`✓ Delivery job ${job.id} completed`);
});

deliveryWorker.on("failed", (job, err) => {
  logger.error(`✗ Delivery job ${job?.id} failed:`, err instanceof Error ? err.message : err);
});
