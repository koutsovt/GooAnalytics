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

  // GA4 only reports Business Profile interactions when the property is linked
  // to a Business Profile. A connected property with all-zero interactions almost
  // always means "not linked", not a genuine month of zero calls/bookings, so we
  // must label it NOT MEASURED rather than feed the model phantom zeros.
  const localConnectedWithData = data.connections.ga4 && data.local.totalInteractions > 0;
  const localSection = localConnectedWithData
    ? `LOCAL PRESENCE (Google Business Profile)
- Website clicks: ${data.local.websiteClicks}
- Call requests: ${data.local.calls}
- Directions requests: ${data.local.directions}
- Booking requests: ${data.local.bookings}
- Total interactions: ${data.local.totalInteractions} (${data.local.interactionsDelta > 0 ? "+" : ""}${data.local.interactionsDelta}% vs prior month)`
    : data.connections.ga4
      ? `LOCAL PRESENCE (Google Business Profile)
- NOT MEASURED: the Business Profile is not linked to Google Analytics, so off-site customer actions (calls, directions, bookings) are not tracked. Treat these as unmeasured, NEVER as zero. You may mention in the summary that these actions aren't tracked yet, but do NOT turn the technical linking step into one of the 3 owner actions (see analysis rules).`
      : `LOCAL PRESENCE (Google Business Profile)
- NOT CONNECTED: customer actions (calls, directions, bookings) are UNKNOWN this period. Do not state or imply they are zero.`;

  const reputationSection = data.connections.gbp
    ? `REPUTATION
- Average rating: ${data.reputation.averageRating}/5 (${data.reputation.totalReviews} total reviews)
- New reviews this month: ${data.reputation.newReviewsThisMonth}`
    : `REPUTATION
- NOT CONNECTED: review and rating data is UNKNOWN. Do not claim the business has zero reviews or no reviews.`;

  return `You are a trusted advisor writing a monthly website brief for a small business owner who is NOT technical (think: a hairdresser, a cafe owner). Write the way you would explain it to them across a table — warm, plain-English, owner-to-owner. A vivid everyday comparison is welcome when it makes a point land. Never use jargon without immediately saying what it means in normal words.

Business: ${data.businessName}
Period: ${data.period}

${websiteSection}

SEARCH VISIBILITY
- Impressions: ${data.search.impressions}
- Clicks: ${data.search.clicks}
- Click-through rate: ${(data.search.ctr * 100).toFixed(1)}%
- Avg search position: ${data.search.avgPosition}
- Top searches (each shows clicks, impressions, avg position, and click-through rate so you can spot wasted rankings):
${
  data.search.topQueries?.length
    ? data.search.topQueries
        .map((q) => {
          const ctr = q.impressions > 0 ? Math.round((q.clicks / q.impressions) * 100) : 0;
          return `  - "${q.query}": ${q.clicks} clicks, ${q.impressions} impressions, position ${q.position}, ${ctr}% CTR`;
        })
        .join("\n")
    : "  - No data"
}

${localSection}

${reputationSection}

HOW TO ANALYSE — think like a growth analyst, not a cheerleader:
- Prioritise the 3 actions by impact, not by ease. NEVER recommend editing or "optimising" a page that got negligible traffic (a few views) — that is wasted effort. Put the actions where the visitors and the money actually are.
- Drop-off: if one page (usually the homepage) holds the large majority of views while other pages get almost none, visitors are not progressing. The high-value fix is a clearer next step FROM that page (prices, booking, gallery) — not editing the deep pages nobody reaches.
- Search CTR gaps are the biggest opportunity: when a query ranks in the top ~3 positions but its CTR is low (well under ~10%), the ranking is being wasted — usually a Google Maps/local pack or a weak title/description sits above the listing. Call these out by name.
- Two different "listings", do NOT conflate them: (a) the website's own Google search result, controlled by the page TITLE TAG and META DESCRIPTION on the site; (b) the Google Business Profile / Google Maps listing, edited inside Google Business Profile, NOT on the website. For LOCAL searches ("hairdresser <suburb>", "<service> near me") the Maps local pack usually sits above the website link, so the high-leverage fix is the Business Profile listing (photos, services, a current offer, posts) — NOT the website headline. Only recommend website title/meta edits for NON-local, informational queries where the blue link actually competes. Always name which listing you mean in plain words.
- Brand vs non-brand: the business's own name converting well is expected and not an achievement. Real growth comes from winning non-brand local searches ("hairdresser <suburb>", "<service> near me"). Judge those on their own merits.
- Conversion blind spot: if customer actions (calls, directions, bookings) are NOT MEASURED, you may note ONCE in the summary prose that off-site actions aren't tracked yet. But when website traffic (GA4) IS connected, linking analytics / connecting a data feed / "getting your web person to connect tracking" is BANNED from the actions array entirely — it is not action #1, #2, or #3. Owners cannot self-serve it and the data we already have (website visits, search, reputation) is enough to give three real, owner-doable actions. The ONLY time a measurement-setup step may be an action is when WEBSITE TRAFFIC is NOT CONNECTED (then connecting Google Analytics is allowed as the top action).
- Treat very large month-on-month changes (≥ ~100%) with caution: they usually mean the prior month was only partially tracked. Frame it as establishing a baseline, not as real growth.

HOW TO WRITE THE 3 ACTIONS — owner-to-owner, in priority order (most valuable first):
- Each action is ONE short paragraph (2–3 sentences) that does three things, in this order: (1) say in plain words what the data means / why it matters, (2) tell them the specific thing to DO about it, (3) signal the effort and payoff (e.g. "quick website change, big payoff" or "slow burn that compounds").
- Lead with the meaning, not the jargon. Good: "Almost everyone who visits only sees your homepage and leaves..." then the fix. Avoid: "Optimise homepage CTA conversion funnel."
- Be honest about dependencies. If one action only pays off once another is done (e.g. you cannot tell if a website change worked until tracking is connected), say so in plain words.
- Put the biggest revenue-moving action first. (Only when WEBSITE TRAFFIC is NOT CONNECTED does "connect Google Analytics" count as that first action.) Do not pad with low-impact busywork just to reach three.
- No two actions may pull the same lever. "Rewrite the headline/title to lift CTR" is ONE action, not two — if CTR is the theme, give a single sharp action and make the other two genuinely different (e.g. a next-step fix on the homepage, or strengthening the Business Profile listing).
- Every action must be something THIS owner can actually do BY THEMSELVES today (edit the website wording, update their Google Business Profile, add a photo/offer/post, write a price or booking button). HARD BAN on these as actions: linking/connecting analytics or a Business Profile, "get your web person/developer to…", installing tracking, any API or technical-setup task. If you catch yourself writing "connect", "link", "data feed", or "web person" in an action, replace that action with a website or Business Profile improvement instead.

RULES — follow strictly:
- Only draw conclusions from CONNECTED data sources. Never describe a "NOT CONNECTED" source as zero, as a decline, or as a performance problem, and never base an action on it being zero.
- NEVER claim the website is down, broken, slow, has a broken link, or has broken/missing tracking. You have not inspected the website and cannot diagnose technical faults from these numbers.
- Search Console clicks while WEBSITE TRAFFIC is NOT CONNECTED is EXPECTED — the visits are simply unmeasured, not zero. Do not frame it as a discrepancy, disconnect, or technical issue.
- If website analytics is not connected, the most useful action is to connect Google Analytics so traffic can be measured.

Write a 3-paragraph plain-English summary for the owner (warm, concrete, no jargon), then exactly 3 actions written as described above, ordered most-valuable first. Output ONLY valid JSON with no markdown fences:

{
  "summary": "3 short paragraphs, owner-to-owner: what happened this month, what's working, and the one thing holding growth back",
  "actions": ["Most valuable action — meaning, then the specific thing to do, then effort/payoff", "Second action, same structure", "Third action, same structure"],
  "subjectLine": "A plain, specific subject line — name the headline result, not generic praise"
}`;
}
