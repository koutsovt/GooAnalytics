import type { Job } from "bullmq";
import { deliveryQueue, reportQueue } from "@/lib/queue";
import type { ReportDeliveryJob, ReportGenerationJob } from "@/lib/queue/types";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;

    let job: Job<ReportGenerationJob | ReportDeliveryJob, unknown, string> | undefined =
      await reportQueue.getJob(jobId);
    if (!job) {
      job = (await deliveryQueue.getJob(jobId)) as
        | Job<ReportGenerationJob | ReportDeliveryJob, unknown, string>
        | undefined;
    }

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();

    return Response.json({
      jobId: job.id,
      state,
      data: job.data,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to get job status:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
