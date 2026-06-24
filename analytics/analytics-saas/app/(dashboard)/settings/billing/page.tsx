import { eq } from "drizzle-orm";
import { BillingActions } from "@/components/dashboard/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportConfigs, subscriptions } from "@/lib/db/schema";
import { effectiveTier, PLANS } from "@/lib/plans";

export default async function BillingPage() {
  const userId = await requireSession();
  const ownerId = await resolveOwner(userId);

  const [subscription, siteCount] = await Promise.all([
    db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, ownerId) }),
    db.$count(reportConfigs, eq(reportConfigs.userId, ownerId)),
  ]);

  const isActive = Boolean(subscription?.active);
  const tier = effectiveTier(subscription?.plan, isActive);
  const plan = PLANS[tier];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">Manage your plan and payment details.</p>

      <Card className="max-w-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-2xl font-bold text-foreground mt-1">{plan.label}</p>
          </div>
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          {isActive
            ? "Automated monthly briefs across your sites, delivered by email and WhatsApp."
            : "Start a plan to generate and schedule monthly briefs for your business."}
        </p>

        <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sites</p>
            <p className="text-sm font-medium text-foreground mt-1">
              {siteCount} of {plan.siteLimit} used
            </p>
          </div>
          {subscription && (
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="text-sm font-medium text-foreground mt-1">
                {subscription.createdAt?.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) ?? "—"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isActive ? (
            <>
              <BillingActions mode="active" />
              {tier === "starter" && (
                <BillingActions mode="upgrade" plan="pro" label="Upgrade to Pro" />
              )}
            </>
          ) : (
            <>
              <BillingActions
                mode="checkout"
                plan="starter"
                label={`Start Starter — $${PLANS.starter.priceMonthly}/mo`}
              />
              <BillingActions
                mode="checkout"
                plan="pro"
                label={`Start Pro — $${PLANS.pro.priceMonthly}/mo`}
                variant="outline"
              />
            </>
          )}
        </div>

        {isActive && (
          <p className="text-xs text-muted-foreground mt-4">
            Invoices, payment method, and renewal date are managed securely in the Stripe billing
            portal.
          </p>
        )}
      </Card>
    </div>
  );
}
