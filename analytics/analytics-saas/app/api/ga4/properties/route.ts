import { listGA4Properties } from "@/lib/clients/ga4";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const userId = await requireSession();
    const tokens = await getValidTokens(userId);
    const properties = await listGA4Properties(tokens);

    return Response.json(properties);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
