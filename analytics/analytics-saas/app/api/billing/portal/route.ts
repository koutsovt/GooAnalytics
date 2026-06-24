import { eq } from "drizzle-orm";
import { canAccessBilling } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { stripe } from "@/lib/clients/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function POST(_req: Request) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);

    // Billing is owner-only: members must not open the owner's Stripe portal.
    if (!(await canAccessBilling(userId, ownerId))) {
      return Response.json(
        { error: "Only the workspace owner can manage billing" },
        { status: 403 },
      );
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ownerId),
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
    logger.error("Portal error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
