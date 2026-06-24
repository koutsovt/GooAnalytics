import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/clients/stripe";
import { db } from "@/lib/db";
import { reportConfigs, subscriptions } from "@/lib/db/schema";
import { env } from "@/lib/env";
import type { PlanTier } from "@/lib/plans";

// Map a Stripe price ID back to our plan tier. Authoritative source of truth for
// "what did the customer actually pay for", independent of metadata surviving.
function tierForPrice(priceId: string | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_ID) return "starter";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  return null;
}

/**
 * Reconcile DB subscription state against Stripe. A safety net for missed
 * webhooks (deploys, downtime, relay gaps): Stripe is the source of truth, so we
 * pull every active subscription and heal any DB row that drifted — wrong plan,
 * stale active flag, or missing entirely.
 *
 * Idempotent and safe to run on a schedule (e.g. every 15 min).
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fixes: string[] = [];

    // 1. Pull every active Stripe subscription and make the DB match.
    const activeStripeSubIds = new Set<string>();
    for await (const sub of stripe.subscriptions.list({ status: "active", limit: 100 })) {
      activeStripeSubIds.add(sub.id);
      const tier = tierForPrice(sub.items.data[0]?.price.id) ?? "starter";

      const row = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, sub.id),
      });
      if (!row) continue; // No local row to attribute it to; checkout webhook owns creation.

      if (!row.active || row.plan !== tier) {
        await db
          .update(subscriptions)
          .set({ active: true, plan: tier, updatedAt: new Date() })
          .where(eq(subscriptions.id, row.id));
        await db
          .update(reportConfigs)
          .set({ subscriptionActive: true, updatedAt: new Date() })
          .where(eq(reportConfigs.userId, row.userId));
        fixes.push(`activated/synced ${sub.id} -> ${tier}`);
      }
    }

    // 2. Any DB row marked active whose Stripe sub is NOT in the active set has
    //    lapsed (cancelled/expired and we missed the event). Downgrade to free.
    const dbActive = await db.query.subscriptions.findMany({
      where: eq(subscriptions.active, true),
    });
    for (const row of dbActive) {
      if (row.stripeSubscriptionId && !activeStripeSubIds.has(row.stripeSubscriptionId)) {
        await db
          .update(subscriptions)
          .set({ active: false, plan: "free", updatedAt: new Date() })
          .where(eq(subscriptions.id, row.id));
        await db
          .update(reportConfigs)
          .set({ subscriptionActive: false, updatedAt: new Date() })
          .where(eq(reportConfigs.userId, row.userId));
        fixes.push(`deactivated ${row.stripeSubscriptionId} (no longer active in Stripe)`);
      }
    }

    return Response.json({ success: true, fixed: fixes.length, fixes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Billing reconcile failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
