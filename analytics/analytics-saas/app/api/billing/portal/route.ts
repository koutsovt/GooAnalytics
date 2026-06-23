import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { stripe } from "@/lib/clients/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const userId = await requireSession();

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (!subscription) {
      return Response.json({ error: "No subscription found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    if (!session.url) {
      throw new Error("No portal URL returned from Stripe");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Portal error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
