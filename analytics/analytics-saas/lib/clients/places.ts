import { env } from "@/lib/env";
import type { ReputationData } from "@/lib/types/brief";

// Google Places API (New) — public review/rating data by text query. Unlike the
// Business Profile v4 path (lib/clients/gbp.ts), this needs NO owner OAuth and NO
// GBP allowlisting: a self-service Maps API key works immediately. The tradeoff
// is it returns PUBLIC data only — the location-wide average + total count, plus
// up to 5 relevance-sorted reviews (not the owner's full, date-ordered history).
const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

// Field mask is mandatory; without it the API errors. Keep it tight — billing is
// per-field-tier, and reviews/rating/userRatingCount sit in the Enterprise tier.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.reviews",
].join(",");

interface PlacesLocalizedText {
  text?: string;
  languageCode?: string;
}

interface PlacesReview {
  rating?: number;
  publishTime?: string; // RFC 3339, e.g. "2026-05-12T03:21:00Z"
  text?: PlacesLocalizedText;
  originalText?: PlacesLocalizedText;
}

interface PlacesPlace {
  id?: string;
  displayName?: PlacesLocalizedText;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
}

interface SearchTextResponse {
  places?: PlacesPlace[];
}

export interface PlacesReputation extends ReputationData {
  placeId: string;
  displayName: string;
  websiteUri: string;
  googleMapsUri: string;
}

function requireKey(): string {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is not set — add it to .env.local to use the Places reviews client.",
    );
  }
  return env.GOOGLE_MAPS_API_KEY;
}

// Shape a raw Places `place` object into the ReputationData the brief consumes.
function toPlacesReputation(
  place: PlacesPlace,
  fallbackName: string,
  periodStart: string,
  periodEnd: string,
): PlacesReputation {
  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);
  periodEndDate.setHours(23, 59, 59, 999);

  const mapped = (place.reviews ?? []).map((r) => ({
    rating: r.rating ?? 0,
    text: r.text?.text ?? r.originalText?.text ?? "",
    date: r.publishTime ?? "",
  }));

  // NOTE: Places only returns up to 5 relevance-sorted reviews, so this count is
  // a floor for "new this period", not the true number — the authoritative
  // figures are averageRating and totalReviews below.
  const newReviews = mapped.filter((r) => {
    if (!r.date) return false;
    const d = new Date(r.date);
    return d >= periodStartDate && d <= periodEndDate;
  });

  return {
    placeId: place.id ?? "",
    displayName: place.displayName?.text ?? fallbackName,
    websiteUri: place.websiteUri ?? "",
    googleMapsUri: place.googleMapsUri ?? "",
    averageRating: typeof place.rating === "number" ? Math.round(place.rating * 10) / 10 : 0,
    totalReviews: place.userRatingCount ?? 0,
    newReviewsThisMonth: newReviews.length,
    newReviews: newReviews.slice(0, 5),
  };
}

/**
 * Resolve a business to its Google Place ID (ChIJ…) from a free-text query.
 * Returns the id plus the matched website so the caller can verify it's the
 * right business before storing it. Null when nothing matches.
 */
export async function resolvePlaceId(
  query: string,
): Promise<{ placeId: string; websiteUri: string; displayName: string } | null> {
  const key = requireKey();
  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.websiteUri",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Places searchText failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as SearchTextResponse;
  const place = data.places?.[0];
  if (!place?.id) return null;

  return {
    placeId: place.id,
    websiteUri: place.websiteUri ?? "",
    displayName: place.displayName?.text ?? query,
  };
}

/**
 * Deterministic reputation lookup by Place ID via Place Details (New). Preferred
 * over text search when a config has a stored placeId — no fuzzy matching, always
 * the exact business. Returns null if the Place ID is unknown/expired.
 */
export async function fetchPlacesReputationByPlaceId(
  placeId: string,
  periodStart: string,
  periodEnd: string,
): Promise<PlacesReputation | null> {
  const key = requireKey();
  const res = await fetch(`${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK.replace(/places\./g, ""),
    },
  });

  // A bad Place ID returns 404 (expired/unknown) or 400 (malformed). Either way
  // it's unresolvable, so signal "unknown" and let the caller fall back to a
  // fresh text search rather than throwing and losing reputation entirely.
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Places details failed (${res.status}): ${detail}`);
  }

  const place = (await res.json()) as PlacesPlace;
  if (!place.id) return null;
  return toPlacesReputation(place, placeId, periodStart, periodEnd);
}

/**
 * Resolve a business by free-text query (name + locality works best, e.g.
 * "Terence Salon Templestowe") and return its public reputation data shaped to
 * the same ReputationData contract the brief pipeline already consumes.
 *
 * Returns null when no place matches. Throws on a missing key or an API error so
 * callers can decide whether to swallow it (the brief pipeline does).
 */
export async function fetchPlacesReputation(
  query: string,
  periodStart: string,
  periodEnd: string,
): Promise<PlacesReputation | null> {
  const key = requireKey();
  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Places searchText failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as SearchTextResponse;
  const place = data.places?.[0];
  if (!place) return null;

  return toPlacesReputation(place, query, periodStart, periodEnd);
}
