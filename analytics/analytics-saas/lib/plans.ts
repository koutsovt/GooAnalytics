/**
 * Subscription plans. Single source of truth for what each tier allows.
 *
 * Pure data only (no env, no secrets) so it can be imported on both the server
 * and the client. Stripe price IDs live in env and are mapped to a plan in the
 * checkout route — never here.
 */
export type PlanTier = "free" | "starter" | "pro";

export interface PlanDef {
  label: string;
  /** Max number of report configs (sites) the owner may create. */
  siteLimit: number;
  priceMonthly: number;
}

export const PLANS: Record<PlanTier, PlanDef> = {
  free: { label: "Free", siteLimit: 0, priceMonthly: 0 },
  starter: { label: "Starter", siteLimit: 1, priceMonthly: 29 },
  pro: { label: "Pro", siteLimit: 5, priceMonthly: 79 },
};

const PAID_TIERS: PlanTier[] = ["starter", "pro"];

export function isPlanTier(value: unknown): value is PlanTier {
  return value === "free" || value === "starter" || value === "pro";
}

/** Resolve the effective tier: only honour the stored plan while the sub is active. */
export function effectiveTier(plan: string | null | undefined, active: boolean): PlanTier {
  if (!active) return "free";
  return isPlanTier(plan) ? plan : "free";
}

/** A checkout request may only target a paid tier. */
export function isPurchasableTier(value: unknown): value is "starter" | "pro" {
  return isPlanTier(value) && PAID_TIERS.includes(value);
}
