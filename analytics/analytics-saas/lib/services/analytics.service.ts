import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { extractServicePrices, findNearbyCompetitors } from "@/lib/clients/competitors";
import { fetchGA4Data } from "@/lib/clients/ga4";
import { fetchReputationData } from "@/lib/clients/gbp";
import { fetchGSCData } from "@/lib/clients/gsc";
import {
  fetchPlacePrimaryType,
  fetchPlacesReputation,
  fetchPlacesReputationByPlaceId,
} from "@/lib/clients/places";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { BriefData, Competitor, CompetitorData, ReputationData } from "@/lib/types/brief";
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

// Competitor landscape resolution (mirrors resolveReputation). Two layers:
//   Layer 1 (reliable): discover nearby same-category businesses via Places and
//     pull rating, review count, and coarse priceLevel.
//   Layer 2 (best-effort, behind COMPETITOR_PRICES_ENABLED): scrape each
//     competitor's + the owner's own site for an explicit price list.
// No-ops (returns disconnected) without an owner placeId or a Maps key. Any
// failure leaves competitors undefined so the report still ships.
async function resolveCompetitors(
  gscSiteUrl: string,
  businessName: string,
  businessType: string | undefined,
  placeId: string | undefined,
): Promise<{ data: CompetitorData | undefined; connected: boolean }> {
  if (!placeId || !env.GOOGLE_MAPS_API_KEY) {
    logger.info("Competitors skipped", {
      reason: !placeId ? "no placeId on config" : "GOOGLE_MAPS_API_KEY not set",
      businessName,
    });
    return { data: undefined, connected: false };
  }

  try {
    // Search query priority: stored business_type → Google's primary category
    // (backfill for older configs that never captured a type) → nothing. We do
    // NOT fall back to businessName because it's the domain (e.g.
    // "terencelondon.com.au"), which returns zero nearby matches.
    let query = businessType?.trim() ?? "";
    if (!query) {
      query = (await fetchPlacePrimaryType(placeId)).trim();
    }
    if (!query) {
      logger.info("Competitors skipped", {
        reason: "no business_type and no Google primary category",
        businessName,
      });
      return { data: undefined, connected: false };
    }
    const competitors = await findNearbyCompetitors(placeId, query, placeId);
    logger.info("Competitor discovery result", {
      businessName,
      query,
      found: competitors.length,
      pricesEnabled: env.COMPETITOR_PRICES_ENABLED,
    });
    if (competitors.length === 0) {
      return { data: undefined, connected: false };
    }

    let currency = "GBP";
    let ownServices: CompetitorData["ownServices"] = [];

    if (env.COMPETITOR_PRICES_ENABLED) {
      // Extract prices for the owner + each competitor in parallel, capped by the
      // list size (already ≤ 5). Each call swallows its own errors.
      const [own, ...enriched] = await Promise.all([
        extractServicePrices(gscSiteUrl, businessName),
        ...competitors.map((c) => extractServicePrices(c.websiteUri, c.name)),
      ]);
      ownServices = own.services;
      if (own.services.length > 0) currency = own.currency;

      competitors.forEach((c: Competitor, i) => {
        const ex = enriched[i];
        if (ex && ex.services.length > 0) {
          c.services = ex.services;
          c.servicesSource = "website";
          currency = ex.currency;
        }
      });
    }

    return {
      data: { currency, competitors, ownServices },
      connected: true,
    };
  } catch (err) {
    logger.warn(
      "Competitor landscape unavailable:",
      err instanceof Error ? err.message : String(err),
    );
    return { data: undefined, connected: false };
  }
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
  businessType?: string,
): Promise<BriefData> {
  const [{ website, local }, search, reputationResult, competitorResult] = await Promise.all([
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
    resolveCompetitors(gscSiteUrl, businessName, businessType, placeId),
  ]);

  return {
    businessName,
    period: `${periodStart} to ${periodEnd}`,
    website,
    search,
    local,
    reputation: reputationResult.reputation,
    competitors: competitorResult.data,
    connections: {
      ga4: Boolean(ga4PropertyId),
      gbp: reputationResult.connected,
      competitors: competitorResult.connected,
    },
  };
}
