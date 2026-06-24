import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { buildAuthClient } from "@/lib/auth/google-oauth";
import type { LocalData, WebsiteData } from "@/lib/types/brief";

export async function fetchGA4Data(
  propertyId: string,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<{ website: WebsiteData; local: LocalData }> {
  const authClient = buildAuthClient(tokens);

  const client = new BetaAnalyticsDataClient({
    authClient: authClient as any,
  });

  const start = new Date(periodStart);
  const priorEnd = new Date(start);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(1);
  const priorStartStr = priorStart.toISOString().slice(0, 10);
  const priorEndStr = priorEnd.toISOString().slice(0, 10);

  const prop = `properties/${propertyId}`;
  const curr = { startDate: periodStart, endDate: periodEnd };
  const prior = { startDate: priorStartStr, endDate: priorEndStr };

  const [
    sessionsRes,
    priorSessionsRes,
    topPagesRes,
    trafficSourceRes,
    engagementRes,
    dailyRes,
    deviceRes,
    durationRes,
  ] = await Promise.all([
    client.runReport({
      property: prop,
      dateRanges: [curr],
      metrics: [{ name: "sessions" }],
    }),
    client.runReport({
      property: prop,
      dateRanges: [prior],
      metrics: [{ name: "sessions" }],
    }),
    client.runReport({
      property: prop,
      dateRanges: [curr],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 5,
    }),
    client.runReport({
      property: prop,
      dateRanges: [curr],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 6,
    }),
    client.runReport({
      property: prop,
      dateRanges: [curr],
      metrics: [{ name: "engagementRate" }],
    }),
    // Daily sessions for the trend line, oldest day first.
    client.runReport({
      property: prop,
      dateRanges: [curr],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    // Sessions by device category for the mobile/desktop split.
    client.runReport({
      property: prop,
      dateRanges: [curr],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    }),
    // Average session duration (seconds) for "time on site".
    client.runReport({
      property: prop,
      dateRanges: [curr],
      metrics: [{ name: "averageSessionDuration" }],
    }),
  ]);

  // Business Profile interactions in GA4 only exist when the property is linked to a
  // Google Business Profile. On unlinked properties these metrics return INVALID_ARGUMENT,
  // so keep them optional and never let them sink the whole report (which already cost us
  // real website traffic when bundled into the main Promise.all). On failure, fall back to
  // null and leave interactions at zero.
  const gbpResults = await Promise.all([
    client.runReport({
      property: prop,
      dateRanges: [curr],
      dimensions: [{ name: "businessProfileInteractionType" }],
      metrics: [{ name: "businessProfileInteractions" }],
    }),
    client.runReport({
      property: prop,
      dateRanges: [prior],
      dimensions: [{ name: "businessProfileInteractionType" }],
      metrics: [{ name: "businessProfileInteractions" }],
    }),
  ]).catch(() => null);
  const gbpRows = gbpResults?.[0][0]?.rows ?? [];
  const priorGbpRows = gbpResults?.[1][0]?.rows ?? [];

  const sessions = parseInt(sessionsRes[0]?.rows?.[0]?.metricValues?.[0]?.value ?? "0");
  const priorSessions = parseInt(priorSessionsRes[0]?.rows?.[0]?.metricValues?.[0]?.value ?? "0");
  const sessionsDelta =
    priorSessions > 0 ? Math.round(((sessions - priorSessions) / priorSessions) * 1000) / 10 : 0;

  const topPages = (topPagesRes[0]?.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "",
    views: parseInt(r.metricValues?.[0]?.value ?? "0"),
  }));

  const trafficSources = (trafficSourceRes[0]?.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "Unknown",
    sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
  }));

  const engagementRate = parseFloat(engagementRes[0]?.rows?.[0]?.metricValues?.[0]?.value ?? "0");

  const avgSessionDuration = parseFloat(durationRes[0]?.rows?.[0]?.metricValues?.[0]?.value ?? "0");

  const dailySessions = (dailyRes[0]?.rows ?? []).map((r) => ({
    date: r.dimensionValues?.[0]?.value ?? "",
    sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
  }));

  const devices = (deviceRes[0]?.rows ?? []).map((r) => ({
    device: r.dimensionValues?.[0]?.value ?? "unknown",
    sessions: parseInt(r.metricValues?.[0]?.value ?? "0"),
  }));

  const gbpMap: Record<string, number> = {};
  for (const row of gbpRows) {
    gbpMap[row.dimensionValues?.[0]?.value ?? ""] = parseInt(row.metricValues?.[0]?.value ?? "0");
  }

  const calls = gbpMap["CALL"] ?? 0;
  const directions = gbpMap["DRIVING_DIRECTIONS"] ?? 0;
  const websiteClicks = gbpMap["WEBSITE"] ?? 0;
  const bookings = gbpMap["BOOKING"] ?? 0;
  const totalInteractions = calls + directions + websiteClicks + bookings;

  const priorTotal = priorGbpRows.reduce(
    (sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? "0"),
    0,
  );
  const interactionsDelta =
    priorTotal > 0 ? Math.round(((totalInteractions - priorTotal) / priorTotal) * 1000) / 10 : 0;

  return {
    website: {
      sessions,
      sessionsDelta,
      topPages,
      trafficSources,
      engagementRate,
      avgSessionDuration,
      dailySessions,
      devices,
    },
    local: { calls, directions, websiteClicks, bookings, totalInteractions, interactionsDelta },
  };
}

export async function listGA4Properties(
  tokens: GoogleTokens,
): Promise<{ propertyId: string; displayName: string }[]> {
  const authClient = buildAuthClient(tokens);
  const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: authClient });

  // accountSummaries.list returns every property the user can access across all
  // accounts with no filter. properties.list requires a concrete parent/ancestor
  // account id and rejects "accounts/-", so it cannot list across all accounts.
  const res = await analyticsAdmin.accountSummaries.list({ pageSize: 200 });

  return (res.data.accountSummaries ?? []).flatMap((account) =>
    (account.propertySummaries ?? []).map((p) => ({
      propertyId: p.property?.replace("properties/", "") ?? "",
      displayName: p.displayName ?? "Unnamed property",
    })),
  );
}
