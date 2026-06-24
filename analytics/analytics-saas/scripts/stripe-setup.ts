/**
 * One-shot Stripe setup: creates the Starter and Pro products + monthly prices
 * from lib/plans.ts, then prints the env lines to paste into .env.local.
 *
 *   npx tsx scripts/stripe-setup.ts
 *
 * Idempotent: re-running finds existing products (tagged by metadata) and reuses
 * a matching active monthly price instead of creating duplicates. Requires a real
 * STRIPE_SECRET_KEY (sk_test_… in test mode) in .env.local.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(".env.local") });

import { stripe } from "@/lib/clients/stripe";
import { PLANS, type PlanTier } from "@/lib/plans";

const CURRENCY = "aud";
const TIERS: Array<{ tier: Exclude<PlanTier, "free">; envVar: string }> = [
  { tier: "starter", envVar: "STRIPE_PRICE_ID" },
  { tier: "pro", envVar: "STRIPE_PRICE_PRO" },
];

async function findOrCreateProduct(tier: string, name: string) {
  const existing = await stripe.products.search({
    query: `metadata['app']:'analyticsiq' AND metadata['tier']:'${tier}'`,
  });
  if (existing.data[0]) {
    console.log(`  product exists: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name,
    metadata: { app: "analyticsiq", tier },
  });
  console.log(`  product created: ${product.id}`);
  return product;
}

async function findOrCreatePrice(productId: string, amountCents: number) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(
    (p) =>
      p.unit_amount === amountCents &&
      p.currency === CURRENCY &&
      p.recurring?.interval === "month",
  );
  if (match) {
    console.log(`  price exists: ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: CURRENCY,
    unit_amount: amountCents,
    recurring: { interval: "month" },
  });
  console.log(`  price created: ${price.id}`);
  return price;
}

async function main() {
  try {
    await stripe.balance.retrieve();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `\n✗ Stripe key invalid — put a real sk_test_… in .env.local first.\n  ${message}\n`,
    );
    process.exit(1);
  }

  const envLines: string[] = [];
  for (const { tier, envVar } of TIERS) {
    const plan = PLANS[tier];
    console.log(`\n${plan.label} ($${plan.priceMonthly}/mo):`);
    const product = await findOrCreateProduct(tier, `AnalyticsIQ ${plan.label}`);
    const price = await findOrCreatePrice(product.id, plan.priceMonthly * 100);
    envLines.push(`${envVar}=${price.id}`);
  }

  console.log(`\n✓ Done. Put these in .env.local:\n`);
  console.log(envLines.join("\n"));
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
