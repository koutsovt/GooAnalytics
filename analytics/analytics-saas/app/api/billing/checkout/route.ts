import { eq } from "drizzle-orm";
import { canAccessBilling } from "@/lib/auth/permissions";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { stripe } from "@/lib/clients/stripe";
import { db } from "@/lib/db";
import { subscriptions, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isPurchasableTier } from "@/lib/plans";

// STRIPE_PRICE_ID is the Starter price; STRIPE_PRICE_PRO the Pro price.
const PRICE_BY_PLAN = {
  starter: env.STRIPE_PRICE_ID,
  pro: env.STRIPE_PRICE_PRO,
} as const;

export async function POST(req: Request) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);

    // Only the workspace owner may purchase or change a plan. Team members
    // (including admins) must never reach Stripe with the owner's subscription.
    if (!(await canAccessBilling(userId, ownerId))) {
      return Response.json(
        { error: "Only the workspace owner can manage billing" },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { plan?: string };
    const plan = isPurchasableTier(body.plan) ? body.plan : "starter";
    const priceId = PRICE_BY_PLAN[plan];

    if (!priceId) {
      return Response.json(
        { error: `The ${plan} plan is not configured for checkout.` },
        { status: 400 },
      );
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // If the owner already has a live Stripe subscription, this is a PLAN CHANGE,
    // not a new sign-up. Modify the existing subscription in place (Stripe
    // prorates automatically) instead of opening a second checkout — creating a
    // new subscription would leave the customer billed for BOTH plans.
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ownerId),
    });

    if (existing?.active && existing.stripeSubscriptionId) {
      // Already on this plan — nothing to change. Avoids a needless Stripe update
      // (and the proration/invoice events it would emit).
      if (existing.plan === plan) {
        return Response.json({ updated: false, plan });
      }

      const current = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
      const itemId = current.items.data[0]?.id;
      if (!itemId) {
        return Response.json({ error: "Subscription has no items to update" }, { status: 500 });
      }

      await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: { plan },
      });

      // Reflect the new tier immediately; the customer.subscription.updated
      // webhook will also confirm it, but updating now avoids a UI lag.
      await db
        .update(subscriptions)
        .set({ plan, updatedAt: new Date() })
        .where(eq(subscriptions.userId, ownerId));

      // No redirect needed — the change is applied server-side.
      return Response.json({ updated: true, plan });
    }

    // New subscriber: open Stripe Checkout.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Carry the chosen tier through Stripe so the webhook can persist it
      // without re-fetching/expanding line items.
      metadata: { plan },
      subscription_data: { metadata: { plan } },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    if (!session.url) {
      throw new Error("No checkout URL returned from Stripe");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Checkout error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
