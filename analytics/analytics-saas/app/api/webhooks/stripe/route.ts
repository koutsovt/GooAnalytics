import { stripe } from "@/lib/clients/stripe";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { stripeWebhookQueue } from "@/lib/queue";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);

    // Idempotency: key the job by Stripe's event id. Stripe retries the same
    // event id on delivery failure, and BullMQ refuses to enqueue a duplicate
    // jobId, so a retried/replayed webhook is processed at most once. Keep
    // completed/failed jobs for 24h so retries within that window still dedupe
    // (Stripe retries for up to ~3 days, but 24h covers the vast majority).
    await stripeWebhookQueue.add(
      "stripe-event",
      {
        eventType: event.type,
        eventData: event.data as unknown as Record<string, unknown>,
      },
      {
        jobId: event.id,
        removeOnComplete: { age: 24 * 60 * 60 },
        removeOnFail: { age: 24 * 60 * 60 },
      },
    );

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Stripe webhook error:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
