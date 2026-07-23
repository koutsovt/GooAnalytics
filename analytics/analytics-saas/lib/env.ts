import { createEnv } from "@t3-oss/env-nextjs";
import { config as configDotenv } from "dotenv";
import { join } from "path";
import { z } from "zod";

configDotenv({ path: join(process.cwd(), ".env.local") });

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    AUTH_SECRET: z.string().min(32),
    TOKEN_ENCRYPTION_KEY: z.string().min(64),
    RESEND_API_KEY: z.string(),
    EMAIL_FROM: z.string().email(),
    WHATSAPP_PHONE_NUMBER_ID: z.string(),
    WHATSAPP_ACCESS_TOKEN: z.string(),
    ANTHROPIC_API_KEY: z.string(),
    Z_AI_API_KEY: z.string().default(""),
    // Google Maps Places API (New) key. Self-service, key-based, no GBP approval
    // needed. Powers public review/rating data via lib/clients/places.ts.
    GOOGLE_MAPS_API_KEY: z.string().default(""),
    // Gates Layer 2 competitor price extraction (fetch + LLM scrape of rival
    // sites). Off by default — discovery/rating/priceLevel work without it.
    COMPETITOR_PRICES_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    CRON_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    // STRIPE_PRICE_ID is the Starter monthly price (kept for back-compat).
    STRIPE_PRICE_ID: z.string(),
    STRIPE_PRICE_PRO: z.string().default(""),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    Z_AI_API_KEY: process.env.Z_AI_API_KEY || "",
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
    COMPETITOR_PRICES_ENABLED: process.env.COMPETITOR_PRICES_ENABLED || "false",
    CRON_SECRET: process.env.CRON_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO || "",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
});
