/**
 * One-off: activate a user's subscription from their real Stripe data.
 *
 * Use when a checkout completed but the webhook never reached the app (e.g. the
 * endpoint was registered after payment). Looks the user up by email, finds
 * their most recent Stripe subscription, and upserts the DB row as active so the
 * site-creation paywall lifts. Idempotent — safe to re-run.
 *
 * Run:  railway run -s <web-service> -- pnpm tsx scripts/activate-subscription.ts <email>
 */
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import Stripe from "stripe";
import * as schema from "../lib/db/schema";

// Only load .env.local for values not already present. Under `railway run` the
// real production DATABASE_URL/STRIPE_SECRET_KEY are already injected, and they
// must win over any local dev values — so never override existing env.
loadEnv({ path: ".env.local", override: false });

const email = process.argv[2];
if (!email) {
  console.error("Usage: tsx scripts/activate-subscription.ts <email>");
  process.exit(1);
}

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

async function main() {
  const { users, subscriptions, reportConfigs } = schema;

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    throw new Error(`No app user found for email ${email}. Log in once, then retry.`);
  }

  // Find the Stripe customer + subscription for this email.
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    throw new Error(`No Stripe customer found for ${email}.`);
  }

  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 1,
  });
  const sub = subs.data[0];
  if (!sub) {
    throw new Error(`No Stripe subscription found for customer ${customer.id}.`);
  }

  const isActive = sub.status === "active" || sub.status === "trialing";
  // Map the Stripe price to a plan tier. Default to "starter" — the only paid
  // tier most checkouts land on; the webhook keeps this in sync going forward.
  const plan = "starter";

  console.log(
    `User ${user.id} (${email}); Stripe customer ${customer.id}; subscription ${sub.id} status=${sub.status}`,
  );

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customer.id,
        stripeSubscriptionId: sub.id,
        active: isActive,
        plan,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, user.id));
  } else {
    await db.insert(subscriptions).values({
      id: `sub_${user.id}_${Date.now()}`,
      userId: user.id,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: sub.id,
      active: isActive,
      plan,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db
    .update(reportConfigs)
    .set({ subscriptionActive: isActive, updatedAt: new Date() })
    .where(eq(reportConfigs.userId, user.id));

  console.log(`✓ Subscription upserted: active=${isActive}, plan=${plan}`);
  await pool.end();
}

main().catch((err) => {
  console.error("✗ Activation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
