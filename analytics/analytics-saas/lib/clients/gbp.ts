import { google } from "googleapis";
import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { buildAuthClient } from "@/lib/auth/google-oauth";
import { logger } from "@/lib/logger";
import type { ReputationData } from "@/lib/types/brief";

const RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

// Reviews are NOT part of the modern My Business APIs that ship typed clients in
// `googleapis` (mybusinessbusinessinformation, mybusinessaccountmanagement, ...).
// They only exist in the legacy My Business v4 REST API, which has no generated
// client, so we call the endpoint directly through the authenticated OAuth2
// client (it attaches the bearer token and refreshes on 401). Requires the
// `https://www.googleapis.com/auth/business.manage` scope.
const GBP_V4_BASE = "https://mybusiness.googleapis.com/v4";

interface GbpReview {
  starRating?: string;
  comment?: string;
  createTime?: string;
}

interface ListReviewsResponse {
  reviews?: GbpReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

// Lists the Google Business Profile locations the logged-in user can manage,
// returning the full resource name ("accounts/{acc}/locations/{loc}") that the
// reviews endpoint expects, plus a human-readable title. Mirrors the GA4
// property listing so the UI can offer a pick-list instead of a raw ID field.
// Requires the `https://www.googleapis.com/auth/business.manage` scope.
export async function listGBPLocations(
  tokens: GoogleTokens,
): Promise<{ locationId: string; displayName: string }[]> {
  const authClient = buildAuthClient(tokens);

  const accountMgmt = google.mybusinessaccountmanagement({ version: "v1", auth: authClient });
  const businessInfo = google.mybusinessbusinessinformation({ version: "v1", auth: authClient });

  const accountsRes = await accountMgmt.accounts.list({ pageSize: 100 });
  const accounts = accountsRes.data.accounts ?? [];

  const locations: { locationId: string; displayName: string }[] = [];

  for (const account of accounts) {
    const accountName = account.name; // e.g. "accounts/123"
    if (!accountName) continue;

    const locationsRes = await businessInfo.accounts.locations.list({
      parent: accountName,
      readMask: "name,title",
      pageSize: 100,
    });

    for (const loc of locationsRes.data.locations ?? []) {
      // loc.name is "locations/{id}"; the reviews API needs the account-scoped
      // resource "accounts/{acc}/locations/{id}".
      const locName = loc.name?.replace(/^locations\//, "");
      if (!locName) continue;
      locations.push({
        locationId: `${accountName}/locations/${locName}`,
        displayName: loc.title ?? "Unnamed location",
      });
    }
  }

  return locations;
}

export async function fetchReputationData(
  locationId: string,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<ReputationData> {
  const authClient = buildAuthClient(tokens);

  try {
    // locationId is a full resource name, e.g. "accounts/123/locations/456".
    const res = await authClient.request<ListReviewsResponse>({
      url: `${GBP_V4_BASE}/${locationId}/reviews`,
      params: { pageSize: 50 },
    });

    const data = res.data;
    const pageReviews = data.reviews ?? [];

    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);
    periodEndDate.setHours(23, 59, 59);

    // Per-review detail for "new this period" is taken from the most recent page
    // (default order is newest-first). Headline totals below use the API's
    // aggregates, so they stay accurate regardless of this page window.
    const newReviews = pageReviews
      .filter((r) => {
        if (!r.createTime) return false;
        const d = new Date(r.createTime);
        return d >= periodStartDate && d <= periodEndDate;
      })
      .map((r) => ({
        rating: RATING_MAP[r.starRating ?? ""] ?? 0,
        text: r.comment ?? "",
        date: r.createTime ?? "",
      }));

    // Headline numbers come from the API's location-wide aggregates, not from a
    // single page of 50 — otherwise locations with >50 reviews report wrong totals.
    const averageRating =
      typeof data.averageRating === "number" ? Math.round(data.averageRating * 10) / 10 : 0;
    const totalReviews = data.totalReviewCount ?? 0;

    return {
      averageRating,
      totalReviews,
      newReviewsThisMonth: newReviews.length,
      newReviews: newReviews.slice(0, 5),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("GBP reviews unavailable:", message);
    return { averageRating: 0, totalReviews: 0, newReviewsThisMonth: 0, newReviews: [] };
  }
}
