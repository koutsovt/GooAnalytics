import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import type {
  ReportDeliveryJob,
  ReportGenerationJob,
  StripeWebhookJob,
  WhatsAppWebhookJob,
} from "@/lib/queue/types";

const connection = getRedisConnection();

export const reportQueue = new Queue<ReportGenerationJob>("reports", { connection });

export const deliveryQueue = new Queue<ReportDeliveryJob>("delivery", { connection });

export const stripeWebhookQueue = new Queue<StripeWebhookJob>("stripe-webhooks", { connection });

export const whatsappWebhookQueue = new Queue<WhatsAppWebhookJob>("whatsapp-webhooks", {
  connection,
});
