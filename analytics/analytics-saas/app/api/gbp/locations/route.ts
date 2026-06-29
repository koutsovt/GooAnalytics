import { getValidTokens } from "@/lib/auth/google-oauth";
import { requireSession } from "@/lib/auth/session";
import { listGBPLocations } from "@/lib/clients/gbp";

export async function GET() {
  try {
    const userId = await requireSession();
    const tokens = await getValidTokens(userId);
    const locations = await listGBPLocations(tokens);

    return Response.json(locations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
