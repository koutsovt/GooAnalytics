import { Stripe as StripeAPI } from "stripe";
import { env } from "@/lib/env";

export const stripe = new StripeAPI(env.STRIPE_SECRET_KEY);
