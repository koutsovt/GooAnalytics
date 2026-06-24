import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/auth/google-oauth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // CSRF protection: generate a random state, redirect with it, and persist
    // it in a short-lived httpOnly cookie. The callback rejects any response
    // whose state does not match this cookie.
    const state = crypto.randomBytes(32).toString("hex");
    const response = NextResponse.redirect(getAuthUrl(state));

    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("Failed to generate auth URL:", error);
    return new Response("Failed to initiate Google OAuth", { status: 500 });
  }
}
