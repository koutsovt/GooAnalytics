import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, upsertTokenRow } from "@/lib/auth/google-oauth";
import { setSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
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

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("OAuth callback failed:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url)
    );
  }
}
