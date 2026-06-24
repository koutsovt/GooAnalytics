import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken, verifyToken } from "@/lib/auth/session-token";
import { env } from "@/lib/env";

const SESSION_COOKIE_NAME = "session";
const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const signedCookie = await signToken(userId, env.AUTH_SECRET);

  cookieStore.set(SESSION_COOKIE_NAME, signedCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const signedCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!signedCookie) return null;

  return verifyToken(signedCookie, env.AUTH_SECRET);
}

export async function requireSession(): Promise<string> {
  const userId = await getSession();
  if (!userId) redirect("/login");
  return userId;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
