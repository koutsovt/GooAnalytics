import { eq } from "drizzle-orm";
import { BillingActions } from "@/components/dashboard/billing-actions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";

export default async function BillingPage() {
  const userId = await requireSession();
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  return (
    <div>
      <h1 className="text-4xl font-bold text-color-foreground mb-8">Billing</h1>

      <div className="rounded-lg border border-color-border bg-color-input p-6 max-w-md">
        <h2 className="text-2xl font-bold text-color-foreground mb-6">Subscription</h2>

        {subscription ? (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-color-foreground">Status</p>
              <p className="text-base font-medium mt-1">
                {subscription.active ? (
                  <span className="text-color-success">Active</span>
                ) : (
                  <span className="text-color-foreground">Inactive</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-base font-semibold text-color-foreground">Stripe Customer ID</p>
              <p className="text-base text-color-foreground font-mono mt-1 break-all">
                {subscription.stripeCustomerId}
              </p>
            </div>
            {subscription.stripeSubscriptionId && (
              <div>
                <p className="text-base font-semibold text-color-foreground">Stripe Subscription ID</p>
                <p className="text-base text-color-foreground font-mono mt-1 break-all">
                  {subscription.stripeSubscriptionId}
                </p>
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-color-foreground">Created</p>
              <p className="text-base text-color-foreground font-medium mt-1">
                {subscription.createdAt?.toLocaleDateString()}
              </p>
            </div>
            <BillingActions mode="active" />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-base text-color-foreground font-medium mb-4">No subscription found</p>
            <BillingActions mode="inactive" />
          </div>
        )}
      </div>
    </div>
  );
}
