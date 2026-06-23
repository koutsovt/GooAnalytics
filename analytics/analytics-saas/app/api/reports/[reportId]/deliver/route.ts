import { requireSession } from "@/lib/auth/session";
import { deliveryQueue } from "@/lib/queue";
import type { ReportDeliveryJob } from "@/lib/queue/types";

export async function POST(req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    console.log(`[Deliver API] Request received for report delivery`);
    const userId = await requireSession();
    const { reportId } = await params;
    console.log(`[Deliver API] User ${userId}, Report ${reportId}`);

    let body: { channels?: ReportDeliveryJob["channels"] } = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (error) {
      console.log(`[Deliver API] No JSON body, using defaults`);
    }
    console.log(`[Deliver API] Request body:`, body);

    const channels = body.channels || ["email"];

    if (channels.length === 0) {
      return Response.json(
        {
          error: "channels array must not be empty",
        },
        { status: 400 },
      );
    }

    const job = await deliveryQueue.add(
      `delivery-${reportId}-${Date.now()}`,
      {
        reportId,
        userId,
        channels,
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
        message: "Delivery job enqueued",
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : "";
    console.error("[Deliver API] Failed to enqueue delivery:", message);
    console.error("[Deliver API] Stack:", stack);
    return Response.json({ error: message }, { status: 500 });
  }
}
