import { type Job, Worker } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import type { ReportDeliveryJob } from "@/lib/queue/types";
import { deliverReport } from "@/lib/services/delivery.service";

const connection = getRedisConnection();

export const deliveryWorker = new Worker<ReportDeliveryJob>(
  "delivery",
  async (job: Job<ReportDeliveryJob>) => {
    try {
      console.log(`[Delivery Worker] Job data:`, job.data);
      const { reportId, userId, channels } = job.data;

      job.log(`Delivering report ${reportId} to channels: ${channels.join(", ")}`);
      console.log(`[Delivery] Starting delivery for report ${reportId}`);

      const results = await deliverReport(reportId, userId, channels);
      console.log(`[Delivery] Delivery complete, results:`, results);

      job.log("Delivery processing complete");
      return { reportId, results, status: "success" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : "";
      console.error(`[Delivery] Error:`, message, stack);
      job.log(`Error: ${message}`);
      throw error;
    }
  },
  { connection },
);

deliveryWorker.on("completed", (job) => {
  console.log(`✓ Delivery job ${job.id} completed`);
});

deliveryWorker.on("failed", (job, err) => {
  console.error(`✗ Delivery job ${job?.id} failed:`, err instanceof Error ? err.message : err);
});
