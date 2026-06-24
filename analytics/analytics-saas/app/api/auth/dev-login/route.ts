import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Dev login only available in development" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") || "dev@example.com";

  try {
    // Find or create dev user
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      const userId = `usr_dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.insert(users).values({
        id: userId,
        email,
        name: "Dev User",
        createdAt: new Date(),
      });
      user = { id: userId, email, name: "Dev User", createdAt: new Date() };
    }

    // Set session cookie
    await setSessionCookie(user.id);

    // Redirect to dashboard
    redirect("/dashboard");
  } catch (error) {
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    logger.error("Dev login error:", error);
    return Response.json(
      { error: "Dev login failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    );
  }
}
