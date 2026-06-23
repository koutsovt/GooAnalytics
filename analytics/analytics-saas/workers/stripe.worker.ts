import { type Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportConfigs, subscriptions, users } from "@/lib/db/schema";
import { getRedisConnection } from "@/lib/queue/connection";
import type { StripeWebhookJob } from "@/lib/queue/types";

const connection = getRedisConnection();

export const stripeWorker = new Worker<StripeWebhookJob>(
  "stripe-webhooks",
  async (job: Job<StripeWebhookJob>) => {
    const { eventType, eventData } = job.data;

    if (eventType === "checkout.session.completed") {
      const session = eventData.object as {
        customer: string;
        subscription: string;
        customer_email: string;
      };

      try {
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_email as string;

        let user = await db.query.users.findFirst({
          where: eq(users.email, customerEmail),
        });

        if (!user) {
          const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          await db.insert(users).values({
            id: userId,
            email: customerEmail,
            name: customerEmail.split("@")[0],
            createdAt: new Date(),
          });
          user = {
            id: userId,
            email: customerEmail,
            name: customerEmail.split("@")[0],
            createdAt: new Date(),
          };
        }

        const existing = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.userId, user.id),
        });

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              active: true,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, user.id));
        } else {
          await db.insert(subscriptions).values({
            id: `sub_${user.id}_${Date.now()}`,
            userId: user.id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await db
          .update(reportConfigs)
          .set({ subscriptionActive: true, updatedAt: new Date() })
          .where(eq(reportConfigs.userId, user.id));

        job.log(`✓ Subscription activated for ${customerEmail}`);
      } catch (error) {
        job.log(`✗ Error processing checkout: ${error}`);
        throw error;
      }
    }

    if (eventType === "customer.subscription.updated") {
      const sub = eventData.object as {
        id: string;
        customer: string;
        status: string;
      };

      try {
        const customerId = sub.customer as string;
        const isActive = sub.status === "active";

        const sub_row = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, sub.id),
        });

        if (sub_row) {
          await db
            .update(subscriptions)
            .set({ active: isActive, updatedAt: new Date() })
            .where(eq(subscriptions.id, sub_row.id));

          await db
            .update(reportConfigs)
            .set({ subscriptionActive: isActive, updatedAt: new Date() })
            .where(eq(reportConfigs.userId, sub_row.userId));

          job.log(`✓ Subscription ${sub.id} updated to ${isActive ? "active" : "inactive"}`);
        }
      } catch (error) {
        job.log(`✗ Error processing update: ${error}`);
        throw error;
      }
    }

    if (eventType === "customer.subscription.deleted") {
      const sub = eventData.object as { id: string };

      try {
        const sub_row = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, sub.id),
        });

        if (sub_row) {
          await db
            .update(subscriptions)
            .set({ active: false, updatedAt: new Date() })
            .where(eq(subscriptions.id, sub_row.id));

          await db
            .update(reportConfigs)
            .set({ subscriptionActive: false, updatedAt: new Date() })
            .where(eq(reportConfigs.userId, sub_row.userId));

          job.log(`✓ Subscription ${sub.id} cancelled`);
        }
      } catch (error) {
        job.log(`✗ Error processing cancellation: ${error}`);
        throw error;
      }
    }

    return { eventType, processed: true };
  },
  { connection },
);

stripeWorker.on("completed", (job) => {
  console.log(`✓ Stripe webhook job ${job.id} completed`);
});

stripeWorker.on("failed", (job, err) => {
  console.error(
    `✗ Stripe webhook job ${job?.id} failed:`,
    err instanceof Error ? err.message : err,
  );
});
