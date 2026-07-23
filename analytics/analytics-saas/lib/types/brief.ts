export interface WebsiteData {
  sessions: number;
  sessionsDelta: number;
  topPages: { path: string; views: number }[];
  trafficSources: { source: string; sessions: number }[];
  engagementRate: number;
  // Added later — optional so reports stored before this change still parse.
  avgSessionDuration?: number; // seconds
  dailySessions?: { date: string; sessions: number }[]; // date is YYYYMMDD
  devices?: { device: string; sessions: number }[]; // device = mobile|desktop|tablet
}

export interface SearchData {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  topQueries: { query: string; clicks: number; impressions: number; position: number }[];
}

export interface LocalData {
  calls: number;
  directions: number;
  websiteClicks: number;
  bookings: number;
  totalInteractions: number;
  interactionsDelta: number;
}

export interface ReputationData {
  averageRating: number;
  totalReviews: number;
  newReviewsThisMonth: number;
  newReviews: { rating: number; text: string; date: string }[];
}

// A single service line scraped from a competitor's (or the owner's own) website.
// Best-effort Layer 2 data: only ever populated when explicit prices are found,
// always kept alongside the raw string so the UI can say "approx, from their site".
export interface CompetitorService {
  name: string; // e.g. "Men's Cut"
  price: number; // numeric, in CompetitorData.currency
  raw: string; // original string as scraped, e.g. "from £35"
}

// One nearby competitor. Layer 1 (discovery, rating, priceLevel) is reliable;
// `services` is best-effort Layer 2 and is [] whenever extraction is off/failed.
export interface Competitor {
  placeId: string;
  name: string;
  websiteUri: string;
  googleMapsUri: string;
  distanceKm: number | null;
  rating: number; // 0 when unknown
  totalReviews: number;
  priceLevel: number | null; // 1–4 Google relative price, null if unknown
  services: CompetitorService[]; // [] when price extraction failed/skipped
  servicesSource: "website" | "none";
}

export interface CompetitorData {
  currency: string; // inferred, default "GBP" for Terence London
  competitors: Competitor[]; // capped, nearest first
  ownServices: CompetitorService[]; // owner's own prices, same extraction path
}

export interface BriefData {
  businessName: string;
  period: string;
  website: WebsiteData;
  search: SearchData;
  local: LocalData;
  reputation: ReputationData;
  // Optional so reports stored before this feature still parse. Absent when there
  // is no owner placeId / no Maps key, or when discovery failed entirely.
  competitors?: CompetitorData;
  // Which Google data sources are actually linked for this business. When false,
  // the matching section holds placeholder zeros, NOT measured zeros — the brief
  // must treat it as "unknown", never as a real result.
  connections: {
    ga4: boolean; // website traffic + Business Profile interactions
    gbp: boolean; // reputation (reviews/rating)
    competitors: boolean; // nearby competitor landscape available
  };
}

export interface ReportOutput {
  summary: string;
  actions: string[];
  subjectLine: string;
}
