import Stripe from "stripe";
import { env } from "@/lib/env";

// Default import is the canonical Stripe constructor and resolves correctly under
// both ESM (Next) and CJS (tsx workers/scripts); the named `{ Stripe }` export
// only exists in the ESM build and throws "not a constructor" under CJS.
export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
