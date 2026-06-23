import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session";

async function verifyCookie(signedValue: string, authSecret: string): Promise<string | null> {
  const [value, signature] = signedValue.split(".");
  if (!value || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    return signature === expected ? value : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const publicRoutes = ["/login", "/api/auth", "/"];
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (isPublic && pathname === "/") {
    return NextResponse.next();
  }

  const protectedPaths = ["/dashboard", "/reports", "/properties", "/settings"];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) {
    return NextResponse.next();
  }

  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    console.error("AUTH_SECRET not set");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const signedCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!signedCookie || !(await verifyCookie(signedCookie, authSecret))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
