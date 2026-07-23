import { google } from "googleapis";
import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { buildAuthClient } from "@/lib/auth/google-oauth";
import { logger } from "@/lib/logger";
import type { SearchData } from "@/lib/types/brief";

const EMPTY_SEARCH: SearchData = {
  impressions: 0,
  clicks: 0,
  ctr: 0,
  avgPosition: 0,
  topQueries: [],
};

export async function fetchGSCData(
  siteUrl: string,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<SearchData> {
  const authClient = buildAuthClient(tokens);
  const sc = google.searchconsole({ version: "v1", auth: authClient });

  try {
    const [overviewRes, queriesRes] = await Promise.all([
      sc.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: periodStart, endDate: periodEnd, dimensions: [], rowLimit: 1 },
      }),
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: periodStart,
          endDate: periodEnd,
          dimensions: ["query"],
          rowLimit: 8,
        },
      }),
    ]);

    const overview = overviewRes.data.rows?.[0];

    return {
      impressions: overview?.impressions ?? 0,
      clicks: overview?.clicks ?? 0,
      ctr: overview?.ctr ?? 0,
      avgPosition: Math.round((overview?.position ?? 0) * 10) / 10,
      topQueries: (queriesRes.data.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        position: Math.round((r.position ?? 0) * 10) / 10,
      })),
    };
  } catch (err: unknown) {
    // A missing webmasters scope or a site the user can't access should degrade
    // the Search Console section to zeros, not sink the whole report (which
    // still carries GA4 traffic and reputation). Mirrors the GBP client, which
    // already swallows its own failures.
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("GSC data unavailable:", message);
    return { ...EMPTY_SEARCH };
  }
}

export async function listGSCSites(
  tokens: GoogleTokens,
): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const authClient = buildAuthClient(tokens);
  const sc = google.searchconsole({ version: "v1", auth: authClient });
  const res = await sc.sites.list();

  return (res.data.siteEntry ?? []).map((s) => ({
    siteUrl: s.siteUrl ?? "",
    permissionLevel: s.permissionLevel ?? "",
  }));
}
