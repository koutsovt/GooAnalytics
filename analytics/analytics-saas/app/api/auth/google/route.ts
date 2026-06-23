import { redirect } from "next/navigation";
import { getAuthUrl } from "@/lib/auth/google-oauth";

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    redirect(authUrl);
  } catch (error) {
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to generate auth URL:", error);
    return new Response("Failed to initiate Google OAuth", { status: 500 });
  }
}
