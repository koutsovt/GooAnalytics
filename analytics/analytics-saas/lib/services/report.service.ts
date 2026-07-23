import { eq } from "drizzle-orm";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { generateBrief } from "@/lib/clients/anthropic";
import { db } from "@/lib/db";
import { reportConfigs, reportHistory } from "@/lib/db/schema";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";
import type { ReportOutput } from "@/lib/types/brief";

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

  const brief = await generateBrief(analyticsData);

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
