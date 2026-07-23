import { and, desc, eq } from "drizzle-orm";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { generateBrief } from "@/lib/clients/anthropic";
import { db } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";
import type { PriorReport, ReportOutput } from "@/lib/types/brief";

// Fetch the most recent SUCCESSFUL report for a config and distil it into the
// compact PriorReport the brief prompt uses to close the loop. Returns undefined
// for the first-ever report (or if the prior row is malformed) so the brief just
// omits the "since last month" section. Never throws — a bad prior must not block
// a new report.
export async function getPriorReport(configId: string): Promise<PriorReport | undefined> {
  try {
    const prior = await db.query.reportHistory.findFirst({
      where: and(eq(reportHistory.configId, configId), eq(reportHistory.status, "success")),
      orderBy: [desc(reportHistory.createdAt)],
    });
    if (!prior?.reportData || !prior.rawData) return undefined;

    const raw = prior.rawData;
    return {
      period: prior.period,
      actions: Array.isArray(prior.reportData.actions) ? prior.reportData.actions : [],
      metrics: {
        sessions: raw.connections?.ga4 ? (raw.website?.sessions ?? null) : null,
        searchClicks: raw.search?.clicks ?? null,
        averageRating: raw.connections?.gbp ? (raw.reputation?.averageRating ?? null) : null,
        totalReviews: raw.connections?.gbp ? (raw.reputation?.totalReviews ?? null) : null,
      },
    };
  } catch {
    return undefined;
  }
}

export async function generateReport(
  userId: string,
  configId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportOutput> {
  const config = await db.query.reportConfigs.findFirst({
    where: eq(reportConfigs.id, configId),
  });

  if (!config) {
    throw new Error(`Report config ${configId} not found`);
  }

  if (!config.gscSiteUrl) {
    throw new Error("Website URL is required to generate a report");
  }

  const tokens = await getValidTokens(userId);

  const analyticsData = await fetchAnalyticsData(
    config.businessName,
    config.ga4PropertyId ?? undefined,
    config.gscSiteUrl,
    config.gbpLocationId ?? undefined,
    tokens,
    periodStart,
    periodEnd,
    config.placeId ?? undefined,
    config.businessType ?? undefined,
  );

  // Loop-closing context: last month's actions + headline metrics. Fetched
  // BEFORE we insert this report so it can't pick up the row we're about to write.
  const prior = await getPriorReport(configId);
  const brief = await generateBrief(analyticsData, prior);

  const period = `${periodStart}_to_${periodEnd}`;

  await db.insert(reportHistory).values({
    id: `rpt_${userId}_${Date.now()}`,
    userId,
    configId,
    period,
    status: "success",
    reportData: brief,
    rawData: analyticsData,
    createdAt: new Date(),
  });

  return brief;
}
