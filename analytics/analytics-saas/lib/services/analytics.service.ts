import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { fetchGA4Data } from "@/lib/clients/ga4";
import { fetchReputationData } from "@/lib/clients/gbp";
import { fetchGSCData } from "@/lib/clients/gsc";
import { fetchPlacesReputation, fetchPlacesReputationByPlaceId } from "@/lib/clients/places";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { BriefData, ReputationData } from "@/lib/types/brief";
import { sameHost } from "@/lib/url";

const EMPTY_REPUTATION: ReputationData = {
  averageRating: 0,
  totalReviews: 0,
  newReviewsThisMonth: 0,
  newReviews: [],
};

function toReputation(places: {
  averageRating: number;
  totalReviews: number;
  newReviewsThisMonth: number;
  newReviews: ReputationData["newReviews"];
}): ReputationData {
  return {
    averageRating: places.averageRating,
    totalReviews: places.totalReviews,
    newReviewsThisMonth: places.newReviewsThisMonth,
    newReviews: places.newReviews,
  };
}

// Reputation has three possible sources, in priority order:
//   1. Business Profile v4 (owner-consented, authoritative) when the config has
//      a gbpLocationId. Requires GBP API allowlisting.
//   2. Places API (New) by stored Place ID — deterministic, always the exact
//      business. Preferred whenever a placeId was resolved at config creation.
//   3. Places API (New) text search by business name as a fallback (e.g. legacy
//      configs with no stored placeId). We only trust a text-search match whose
//      website equals the configured site, so a different same-named business
//      can never attach its reviews to this report.
// `connected` drives connections.gbp, which gates the REPUTATION section in the
// brief prompt — true only when we actually have review data.
async function resolveReputation(
  businessName: string,
  gscSiteUrl: string,
  gbpLocationId: string | undefined,
  placeId: string | undefined,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<{ reputation: ReputationData; connected: boolean }> {
  if (gbpLocationId) {
    const reputation = await fetchReputationData(gbpLocationId, tokens, periodStart, periodEnd);
    return { reputation, connected: true };
  }

  if (env.GOOGLE_MAPS_API_KEY) {
    try {
      // 2. Deterministic lookup by stored Place ID.
      if (placeId) {
        const byId = await fetchPlacesReputationByPlaceId(placeId, periodStart, periodEnd);
        if (byId) {
          return { reputation: toReputation(byId), connected: true };
        }
        // Place ID stale/expired — fall through to text search below.
      }

      // 3. Text-search fallback, guarded by website host match.
      const places = await fetchPlacesReputation(businessName, periodStart, periodEnd);
      if (places && sameHost(places.websiteUri, gscSiteUrl)) {
        return { reputation: toReputation(places), connected: true };
      }
    } catch (err) {
      logger.warn(
        "Places reputation unavailable:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return { reputation: EMPTY_REPUTATION, connected: false };
}

export async function fetchAnalyticsData(
  businessName: string,
  ga4PropertyId: string | undefined,
  gscSiteUrl: string,
  gbpLocationId: string | undefined,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
  placeId?: string,
): Promise<BriefData> {
  const [{ website, local }, search, reputationResult] = await Promise.all([
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
    resolveReputation(
      businessName,
      gscSiteUrl,
      gbpLocationId,
      placeId,
      tokens,
      periodStart,
      periodEnd,
    ),
  ]);

  return {
    businessName,
    period: `${periodStart} to ${periodEnd}`,
    website,
    search,
    local,
    reputation: reputationResult.reputation,
    connections: {
      ga4: Boolean(ga4PropertyId),
      gbp: reputationResult.connected,
    },
  };
}
