import { desc, eq } from "drizzle-orm";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { requireSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/auth/resolve-owner";
import { db } from "@/lib/db";
import { reportHistory } from "@/lib/db/schema";

const sampleFilters = [
  {
    category: "source",
    label: "Data Source",
    options: [
      { id: "ga4", label: "Google Analytics", count: 45 },
      { id: "gsc", label: "Search Console", count: 32 },
      { id: "gbp", label: "Business Profile", count: 28 },
    ],
  },
  {
    category: "device",
    label: "Device Type",
    options: [
      { id: "mobile", label: "Mobile", count: 62 },
      { id: "desktop", label: "Desktop", count: 35 },
      { id: "tablet", label: "Tablet", count: 8 },
    ],
  },
  {
    category: "metric",
    label: "Metrics",
    options: [
      { id: "sessions", label: "Sessions" },
      { id: "users", label: "Users" },
      { id: "pageviews", label: "Page Views" },
      { id: "bounceRate", label: "Bounce Rate" },
    ],
  },
];

export default async function OverviewPage() {
  const userId = await requireSession();
  const ownerId = await resolveOwner(userId);

  const reports = await db.query.reportHistory.findMany({
    where: eq(reportHistory.userId, ownerId),
    orderBy: desc(reportHistory.createdAt),
    limit: 10,
  });

  const successReports = reports.filter((r) => r.status === "success" && r.rawData);
  const latest = successReports[0];

  const sessions = latest?.rawData?.website?.sessions ?? 0;
  const sessionsDelta = latest?.rawData?.website?.sessionsDelta ?? 0;
  const impressions = latest?.rawData?.search?.impressions ?? 0;
  const interactions = latest?.rawData?.local?.totalInteractions ?? 0;
  const rating = latest?.rawData?.reputation?.averageRating ?? 0;

  const chartData = successReports
    .slice(0, 4)
    .reverse()
    .map((r) => ({
      period: r.period,
      sessions: r.rawData?.website?.sessions ?? 0,
    }));

  const sparklineData = chartData.map((d) => ({ value: d.sessions }));
  const impressionData = successReports.slice(0, 4).map((r) => ({
    value: r.rawData?.search?.impressions ?? 0,
  }));
  const interactionData = successReports.slice(0, 4).map((r) => ({
    value: r.rawData?.local?.totalInteractions ?? 0,
  }));
  const ratingData = successReports.slice(0, 4).map((r) => ({
    value: r.rawData?.reputation?.averageRating ?? 0,
  }));

  return (
    <DashboardContent
      initialData={{
        sessions,
        sessionsDelta,
        impressions,
        interactions,
        rating,
        chartData,
        sparklineData,
        impressionData,
        interactionData,
        ratingData,
        period: successReports.length > 0 ? successReports[0].period : "N/A",
        hasReports: successReports.length > 0,
      }}
      filters={sampleFilters}
    />
  );
}
