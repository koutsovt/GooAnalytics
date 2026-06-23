import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { fetchGA4Data } from "@/lib/clients/ga4";
import { fetchReputationData } from "@/lib/clients/gbp";
import { fetchGSCData } from "@/lib/clients/gsc";
import type { BriefData } from "@/lib/types/brief";

export async function fetchAnalyticsData(
  businessName: string,
  ga4PropertyId: string | undefined,
  gscSiteUrl: string,
  gbpLocationId: string | undefined,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<BriefData> {
  const [{ website, local }, search, reputation] = await Promise.all([
    ga4PropertyId
      ? fetchGA4Data(ga4PropertyId, tokens, periodStart, periodEnd)
      : Promise.resolve({
          website: {
            sessions: 0,
            sessionsDelta: 0,
            topPages: [],
            trafficSources: [],
            engagementRate: 0,
          },
          local: {
            calls: 0,
            directions: 0,
            websiteClicks: 0,
            bookings: 0,
            totalInteractions: 0,
            interactionsDelta: 0,
          },
        }),
    fetchGSCData(gscSiteUrl, tokens, periodStart, periodEnd),
    gbpLocationId
      ? fetchReputationData(gbpLocationId, tokens, periodStart, periodEnd)
      : Promise.resolve({
          averageRating: 0,
          totalReviews: 0,
          newReviewsThisMonth: 0,
          newReviews: [],
        }),
  ]);

  return {
    businessName,
    period: `${periodStart} to ${periodEnd}`,
    website,
    search,
    local,
    reputation,
    connections: {
      ga4: Boolean(ga4PropertyId),
      gbp: Boolean(gbpLocationId),
    },
  };
}
