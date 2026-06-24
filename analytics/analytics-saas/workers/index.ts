import { config as configDotenv } from "dotenv";
import { join } from "path";
import { logger } from "@/lib/logger";

configDotenv({ path: join(process.cwd(), ".env.local") });

import { deliveryWorker } from "@/workers/delivery.worker";
import { reportWorker } from "@/workers/report.worker";
import { stripeWorker } from "@/workers/stripe.worker";

const workers = [reportWorker, deliveryWorker, stripeWorker];

logger.info("🚀 Starting background workers...");
logger.info(`   • Report worker (queue: reports)`);
logger.info(`   • Delivery worker (queue: delivery)`);
logger.info(`   • Stripe worker (queue: stripe-webhooks)`);

async function gracefulShutdown() {
  logger.info("\n🛑 Shutting down workers...");
  for (const worker of workers) {
    await worker.close();
  }
  logger.info("✓ All workers stopped");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

logger.info("✓ Workers ready, waiting for jobs...");
