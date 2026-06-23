import { stripe } from "@/lib/clients/stripe";
import { env } from "@/lib/env";
import { stripeWebhookQueue } from "@/lib/queue";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);

    await stripeWebhookQueue.add(
      `stripe-${event.id}`,
      {
        eventType: event.type,
        eventData: event.data as unknown as Record<string, unknown>,
      },
      { removeOnComplete: true },
    );

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook error:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
