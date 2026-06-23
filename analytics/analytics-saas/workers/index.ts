import { config as configDotenv } from "dotenv";
import { join } from "path";

configDotenv({ path: join(process.cwd(), ".env.local") });

import { deliveryWorker } from "@/workers/delivery.worker";
import { reportWorker } from "@/workers/report.worker";
import { stripeWorker } from "@/workers/stripe.worker";

const workers = [reportWorker, deliveryWorker, stripeWorker];

console.log("🚀 Starting background workers...");
console.log(`   • Report worker (queue: reports)`);
console.log(`   • Delivery worker (queue: delivery)`);
console.log(`   • Stripe worker (queue: stripe-webhooks)`);

async function gracefulShutdown() {
  console.log("\n🛑 Shutting down workers...");
  for (const worker of workers) {
    await worker.close();
  }
  console.log("✓ All workers stopped");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

console.log("✓ Workers ready, waiting for jobs...");
