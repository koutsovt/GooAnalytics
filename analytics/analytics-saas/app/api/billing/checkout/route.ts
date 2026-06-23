import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { stripe } from "@/lib/clients/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const userId = await requireSession();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [
        {
          price: env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    if (!session.url) {
      throw new Error("No checkout URL returned from Stripe");
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
