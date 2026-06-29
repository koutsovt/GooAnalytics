import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, OAUTH_STATE_COOKIE, upsertTokenRow } from "@/lib/auth/google-oauth";
import { setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Base all redirects on the public app URL. Behind Railway's proxy, request.url
  // resolves to the internal host (localhost:8080), which would send the browser
  // to localhost. NEXT_PUBLIC_APP_URL is the real public origin.
  const baseUrl = env.NEXT_PUBLIC_APP_URL;

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", baseUrl));
  }

  // CSRF protection: the state echoed back by Google must match the one we set
  // in the httpOnly cookie when starting the flow. A missing/mismatched state
  // means this callback was not initiated by this browser — reject it.
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", baseUrl));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;
    const name = userInfo.name;

    if (!email) {
      throw new Error("No email found in Google profile");
    }

    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.insert(users).values({
        id: userId,
        email,
        name: name ?? null,
        createdAt: new Date(),
      });
      user = { id: userId, email, name: name ?? null, createdAt: new Date() };
    }

    await upsertTokenRow(user.id, tokens);
    await setSessionCookie(user.id);

    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  } catch (error) {
    logger.error("OAuth callback failed:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, baseUrl));
  }
}
