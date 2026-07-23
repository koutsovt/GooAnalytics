import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { buildCompetitorExtractPrompt } from "@/lib/prompts/competitor-extract";
import type { Competitor, CompetitorService } from "@/lib/types/brief";

// Google Places API (New). We reuse the same key-based, no-OAuth path as
// lib/clients/places.ts, but here we DISCOVER nearby same-category businesses
// and pull their coarse `priceLevel` + rating instead of a single business's
// reviews. `priceLevel`, `rating`, `userRatingCount`, `websiteUri` all sit in
// the Enterprise SKU tier, so the field mask stays tight.
const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

// searchText field mask for discovery. Keep it minimal — every extra field can
// bump the billing SKU.
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
].join(",");

// Google returns priceLevel as an enum string, not 1–4. Map it to the numeric
// scale the UI/brief use (null when unspecified/free).
const PRICE_LEVEL_MAP: Record<string, number | null> = {
  PRICE_LEVEL_UNSPECIFIED: null,
  PRICE_LEVEL_FREE: null,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const DEFAULT_MAX_COMPETITORS = 5;
const DEFAULT_RADIUS_METERS = 5000;

interface PlacesLocalizedText {
  text?: string;
  languageCode?: string;
}

interface PlacesLatLng {
  latitude?: number;
  longitude?: number;
}

interface PlacesPlace {
  id?: string;
  displayName?: PlacesLocalizedText;
  websiteUri?: string;
  googleMapsUri?: string;
  location?: PlacesLatLng;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
}

interface SearchTextResponse {
  places?: PlacesPlace[];
}

export interface FindCompetitorsOptions {
  maxResults?: number;
  radiusMeters?: number;
}

function requireKey(): string {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY is not set — add it to .env.local to use the competitor discovery client.",
    );
  }
  return env.GOOGLE_MAPS_API_KEY;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two lat/lng points in kilometres, rounded to
 * one decimal. Returns null if either point is missing a coordinate.
 */
export function haversineKm(
  a: { latitude?: number; longitude?: number } | null | undefined,
  b: { latitude?: number; longitude?: number } | null | undefined,
): number | null {
  if (
    !a ||
    !b ||
    typeof a.latitude !== "number" ||
    typeof a.longitude !== "number" ||
    typeof b.latitude !== "number" ||
    typeof b.longitude !== "number"
  ) {
    return null;
  }
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const d = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(d * 10) / 10;
}

export function mapPriceLevel(priceLevel: string | undefined): number | null {
  if (!priceLevel) return null;
  return PRICE_LEVEL_MAP[priceLevel] ?? null;
}

/**
 * Fetch a Place's lat/lng by Place ID. Used to anchor the nearby search on the
 * owner's exact location. Returns null when the Place ID is unknown/expired.
 */
async function fetchPlaceLocation(placeId: string): Promise<PlacesLatLng | null> {
  const key = requireKey();
  const res = await fetch(`${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "location",
    },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Places details (location) failed (${res.status}): ${detail}`);
  }
  const place = (await res.json()) as PlacesPlace;
  return place.location ?? null;
}

function toCompetitor(place: PlacesPlace, anchor: PlacesLatLng | null): Competitor {
  return {
    placeId: place.id ?? "",
    name: place.displayName?.text ?? "",
    websiteUri: place.websiteUri ?? "",
    googleMapsUri: place.googleMapsUri ?? "",
    distanceKm: haversineKm(anchor, place.location),
    rating: typeof place.rating === "number" ? Math.round(place.rating * 10) / 10 : 0,
    totalReviews: place.userRatingCount ?? 0,
    priceLevel: mapPriceLevel(place.priceLevel),
    services: [],
    servicesSource: "none",
  };
}

/**
 * Discover nearby same-category businesses via Places searchText, biased to the
 * owner's location. Excludes the owner's own place, computes each competitor's
 * distance from the anchor, sorts nearest-first, and caps the result.
 *
 * Layer 1 only — reliable discovery + rating + coarse priceLevel. No scraping.
 * Throws on a missing key or API error so the caller can decide to swallow it.
 */
export async function findNearbyCompetitors(
  anchorPlaceId: string,
  businessType: string,
  ownPlaceId: string,
  opts: FindCompetitorsOptions = {},
): Promise<Competitor[]> {
  const key = requireKey();
  const maxResults = opts.maxResults ?? DEFAULT_MAX_COMPETITORS;
  const radiusMeters = opts.radiusMeters ?? DEFAULT_RADIUS_METERS;

  const anchor = await fetchPlaceLocation(anchorPlaceId);

  const body: Record<string, unknown> = {
    textQuery: businessType,
    // A few extra so that after excluding the owner + capping we still fill the list.
    pageSize: Math.min(20, maxResults + 5),
  };
  if (anchor?.latitude != null && anchor?.longitude != null) {
    body.locationBias = {
      circle: {
        center: { latitude: anchor.latitude, longitude: anchor.longitude },
        radius: radiusMeters,
      },
    };
  }

  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Places searchText (competitors) failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as SearchTextResponse;
  const places = data.places ?? [];

  return places
    .filter((p) => p.id && p.id !== ownPlaceId)
    .map((p) => toCompetitor(p, anchor))
    .sort((a, b) => {
      // Nearest first; unknown distances sink to the bottom.
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Layer 2 — best-effort real service prices scraped from the competitor's own
// website. Inherently fragile: many sites hide prices behind JS booking
// widgets. Every function here swallows its own errors and returns [] rather
// than throwing, so a failed scrape never blocks a report.
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_500_000; // 1.5 MB cap so a huge page can't blow memory
const USER_AGENT =
  "Mozilla/5.0 (compatible; GooAnalyticsBot/1.0; +https://terencelondon.com.au/bot)";

interface ExtractResult {
  currency: string;
  services: CompetitorService[];
}

/**
 * Best-effort robots.txt check: fetch /robots.txt and honour a blanket
 * `Disallow: /` for `*` or our UA. Fails OPEN (returns true) on any error —
 * we're low-volume (report cadence) and never want a flaky robots fetch to be
 * mistaken for a disallow.
 */
async function isFetchAllowed(url: URL): Promise<boolean> {
  try {
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    let res: Response;
    try {
      res = await fetch(robotsUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return true; // no robots.txt → allowed
    const text = await res.text();
    return !robotsDisallowsRoot(text);
  } catch {
    return true;
  }
}

// Returns true only when a relevant group (`*` or our bot) has an unconditional
// `Disallow: /`. Conservative: any parse ambiguity is treated as allowed.
export function robotsDisallowsRoot(robotsTxt: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").trim());
  let relevantGroup = false;
  let sawAnyAgent = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      // A blank line separates groups; we approximate by resetting on each agent
      // line that starts a new group.
      if (sawAnyAgent && !value) continue;
      sawAnyAgent = true;
      const ua = value.toLowerCase();
      relevantGroup = ua === "*" || ua.includes("gooanalyticsbot");
    } else if (key === "disallow" && relevantGroup) {
      if (value === "/") return true;
    }
  }
  return false;
}

/** Strip a fetched HTML document down to readable text for the extractor. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&pound;/gi, "£")
    .replace(/&#163;/g, "£")
    .replace(/&#8364;/g, "€")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch a page's HTML with a timeout, UA, and byte cap. Null on any failure. */
async function fetchPageHtml(websiteUri: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(websiteUri);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  if (!(await isFetchAllowed(url))) {
    logger.debug("Competitor scrape skipped by robots.txt", { host: url.host });
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;

    // Read with a hard byte cap so a giant page can't exhaust memory.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        chunks.push(value);
        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(concatChunks(chunks));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Parse the LLM's JSON reply into a validated ExtractResult. Tolerates ```json
 * fences and non-numeric prices. Returns null on any malformed structure so the
 * caller falls back to an empty list.
 */
export function parseExtractResponse(content: string): ExtractResult | null {
  let jsonText = content.trim();
  jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const rawServices = Array.isArray(obj.services) ? obj.services : [];
  const services: CompetitorService[] = [];
  for (const item of rawServices) {
    if (typeof item !== "object" || item === null) continue;
    const s = item as Record<string, unknown>;
    const name = typeof s.name === "string" ? s.name.trim() : "";
    const price = typeof s.price === "number" ? s.price : Number(s.price);
    const raw = typeof s.raw === "string" ? s.raw.trim() : "";
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    services.push({ name, price, raw: raw || String(price) });
  }
  const currency = typeof obj.currency === "string" && obj.currency ? obj.currency : "GBP";
  return { currency, services: services.slice(0, 15) };
}

async function callExtractionLLM(
  pageText: string,
  businessName: string,
): Promise<ExtractResult | null> {
  const apiKey = env.Z_AI_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;

  const prompt = buildCompetitorExtractPrompt(pageText, businessName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-5.2",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0,
        thinking: { type: "disabled" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    return parseExtractResponse(content);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Best-effort extraction of an explicit service price list from a website.
 * Gated by COMPETITOR_PRICES_ENABLED. Returns { currency, services } — services
 * is [] whenever the flag is off, the fetch fails, or no prices are found. NEVER
 * throws to the caller.
 */
export async function extractServicePrices(
  websiteUri: string,
  businessName: string,
): Promise<ExtractResult> {
  const empty: ExtractResult = { currency: "GBP", services: [] };
  if (!env.COMPETITOR_PRICES_ENABLED) return empty;
  if (!websiteUri) return empty;

  try {
    const html = await fetchPageHtml(websiteUri);
    if (!html) return empty;
    const text = htmlToText(html);
    if (text.length < 40) return empty;
    const result = await callExtractionLLM(text, businessName);
    return result ?? empty;
  } catch (err) {
    logger.warn(
      "Competitor price extraction failed:",
      err instanceof Error ? err.message : String(err),
    );
    return empty;
  }
}
