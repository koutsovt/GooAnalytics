import type { BriefData } from "@/lib/types/brief";

export function buildBriefPrompt(data: BriefData): string {
  const websiteSection = data.connections.ga4
    ? `WEBSITE TRAFFIC
- Sessions: ${data.website.sessions} (${data.website.sessionsDelta > 0 ? "+" : ""}${data.website.sessionsDelta}% vs prior month)
- Top pages: ${data.website.topPages?.length ? data.website.topPages.map((p) => `${p.path} (${p.views} views)`).join("; ") : "No data"}
- Traffic sources: ${data.website.trafficSources?.length ? data.website.trafficSources.map((s) => `${s.source} (${s.sessions} sessions)`).join("; ") : "No data"}
- Engagement rate: ${(data.website.engagementRate * 100).toFixed(1)}%`
    : `WEBSITE TRAFFIC
- NOT CONNECTED: Google Analytics is not linked for this business, so website traffic (sessions, top pages, engagement) is UNKNOWN this period. Do not state or imply it is zero.`;

  const localSection = data.connections.ga4
    ? `LOCAL PRESENCE (Google Business Profile)
- Website clicks: ${data.local.websiteClicks}
- Call requests: ${data.local.calls}
- Directions requests: ${data.local.directions}
- Booking requests: ${data.local.bookings}
- Total interactions: ${data.local.totalInteractions} (${data.local.interactionsDelta > 0 ? "+" : ""}${data.local.interactionsDelta}% vs prior month)`
    : `LOCAL PRESENCE (Google Business Profile)
- NOT CONNECTED: customer actions (calls, directions, bookings) are UNKNOWN this period. Do not state or imply they are zero.`;

  const reputationSection = data.connections.gbp
    ? `REPUTATION
- Average rating: ${data.reputation.averageRating}/5 (${data.reputation.totalReviews} total reviews)
- New reviews this month: ${data.reputation.newReviewsThisMonth}`
    : `REPUTATION
- NOT CONNECTED: review and rating data is UNKNOWN. Do not claim the business has zero reviews or no reviews.`;

  return `You are a business analyst writing a monthly website performance brief for a small business owner (non-technical).

Business: ${data.businessName}
Period: ${data.period}

${websiteSection}

SEARCH VISIBILITY
- Impressions: ${data.search.impressions}
- Clicks: ${data.search.clicks}
- Click-through rate: ${(data.search.ctr * 100).toFixed(1)}%
- Avg search position: ${data.search.avgPosition}
- Top searches: ${data.search.topQueries?.length ? data.search.topQueries.map((q) => `"${q.query}" (${q.clicks} clicks)`).join("; ") : "No data"}

${localSection}

${reputationSection}

RULES — follow strictly:
- Only draw conclusions from CONNECTED data sources. Never describe a "NOT CONNECTED" source as zero, as a decline, or as a performance problem, and never base an action on it being zero.
- NEVER claim the website is down, broken, slow, has a broken link, or has broken/missing tracking. You have not inspected the website and cannot diagnose technical faults from these numbers.
- Search Console clicks while WEBSITE TRAFFIC is NOT CONNECTED is EXPECTED — the visits are simply unmeasured, not zero. Do not frame it as a discrepancy, disconnect, or technical issue.
- If website analytics is not connected, the most useful action is to connect Google Analytics so traffic can be measured.

Write a 3-paragraph plain-English summary for the business owner, followed by exactly 3 actionable items. Output ONLY valid JSON with no markdown fences:

{
  "summary": "A 3-paragraph plain-English summary tailored to this business's performance",
  "actions": ["Action 1", "Action 2", "Action 3"],
  "subjectLine": "A subject line for an email about this report"
}`;
}
