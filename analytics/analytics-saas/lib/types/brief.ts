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

export interface BriefData {
  businessName: string;
  period: string;
  website: WebsiteData;
  search: SearchData;
  local: LocalData;
  reputation: ReputationData;
  // Which Google data sources are actually linked for this business. When false,
  // the matching section holds placeholder zeros, NOT measured zeros — the brief
  // must treat it as "unknown", never as a real result.
  connections: {
    ga4: boolean; // website traffic + Business Profile interactions
    gbp: boolean; // reputation (reviews/rating)
  };
}

export interface ReportOutput {
  summary: string;
  actions: string[];
  subjectLine: string;
}
