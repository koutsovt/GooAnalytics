import { desc, eq } from "drizzle-orm";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";

export default async function OverviewPage() {
  const userId = await requireSession();
  const ownerId = await resolveOwner(userId);

  const reports = await db.query.reportHistory.findMany({
    where: eq(reportHistory.userId, ownerId),
    orderBy: desc(reportHistory.createdAt),
    limit: 12,
  });

  const successReports = reports.filter((r) => r.status === "success" && r.rawData);
  const latest = successReports[0];
  const raw = latest?.rawData;

  // History is newest-first; reverse a slice for left-to-right trend charts.
  const history = successReports.slice(0, 6).reverse();
  const sparkOf = (pick: (r: (typeof successReports)[number]) => number) =>
    history.map((r) => ({ value: pick(r) }));

  return (
    <DashboardContent
      data={{
        hasReports: successReports.length > 0,
        period: latest?.period ?? "",
        latestReportId: latest?.id ?? null,
        gbpConnected: raw?.connections.gbp ?? false,
        sessions: raw?.website?.sessions ?? 0,
        sessionsDelta: raw?.website?.sessionsDelta ?? 0,
        impressions: raw?.search?.impressions ?? 0,
        clicks: raw?.search?.clicks ?? 0,
        rating: raw?.reputation?.averageRating ?? 0,
        totalReviews: raw?.reputation?.totalReviews ?? 0,
        chartData: history.map((r) => ({
          period: r.period,
          sessions: r.rawData?.website?.sessions ?? 0,
        })),
        sessionsSpark: sparkOf((r) => r.rawData?.website?.sessions ?? 0),
        impressionsSpark: sparkOf((r) => r.rawData?.search?.impressions ?? 0),
        clicksSpark: sparkOf((r) => r.rawData?.search?.clicks ?? 0),
        ratingSpark: sparkOf((r) => r.rawData?.reputation?.averageRating ?? 0),
      }}
    />
  );
}
