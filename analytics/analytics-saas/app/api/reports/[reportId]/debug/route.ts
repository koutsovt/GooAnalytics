import { eq } from "drizzle-orm";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

/**
 * Read-only diagnostic: reports whether a stored report carries competitor data
 * and a redacted summary of it, so we can tell a data problem (nothing stored)
 * from a render problem (stored but not shown) without direct DB access. Owner-
 * scoped and IDOR-guarded like the delivery route. No PII, no writes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const userId = await requireSession();
    const ownerId = await resolveOwner(userId);
    const { reportId } = await params;

    const report = await db.query.reportHistory.findFirst({
      where: eq(reportHistory.id, reportId),
    });
    // Same IDOR guard as the delivery route: only the owning workspace may read.
    if (!report || report.userId !== ownerId) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const raw = report.rawData;
    const comp = raw?.competitors;

    return Response.json({
      reportId,
      status: report.status,
      createdAt: report.createdAt?.toISOString() ?? null,
      connections: raw?.connections ?? null,
      competitorsPresent: Boolean(comp),
      competitorCount: comp?.competitors?.length ?? 0,
      ownServicesCount: comp?.ownServices?.length ?? 0,
      currency: comp?.currency ?? null,
      competitors:
        comp?.competitors?.map((c) => ({
          name: c.name,
          distanceKm: c.distanceKm,
          rating: c.rating,
          priceLevel: c.priceLevel,
          serviceCount: c.services.length,
          servicesSource: c.servicesSource,
        })) ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Report debug read failed", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
