import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/session-token";

const SESSION_COOKIE_NAME = "session";

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
  if (!signedCookie || !(await verifyToken(signedCookie, authSecret))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
