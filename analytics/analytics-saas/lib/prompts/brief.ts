import type { BriefData, PriorReport } from "@/lib/types/brief";

// Build the "SINCE LAST MONTH" block from the previous report, with real deltas
// where both months have the metric. Empty string when there's no prior report
// (first-ever brief) so the prompt reads cleanly.
function buildPriorSection(data: BriefData, prior: PriorReport | undefined): string {
  if (!prior) return "";

  const delta = (label: string, before: number | null, after: number): string => {
    if (before == null) return `- ${label}: ${after} (no comparable figure last month)`;
    const diff = after - before;
    const pct = before !== 0 ? Math.round((diff / before) * 100) : null;
    const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
    const pctText = pct != null ? ` (${diff > 0 ? "+" : ""}${pct}%)` : "";
    return `- ${label}: ${before} → ${after}, ${dir}${pctText}`;
  };

  const lines = [
    delta("Website visits", prior.metrics.sessions, data.website.sessions),
    delta("Search clicks", prior.metrics.searchClicks, data.search.clicks),
    delta("Average rating", prior.metrics.averageRating, data.reputation.averageRating),
    delta("Total reviews", prior.metrics.totalReviews, data.reputation.totalReviews),
  ].join("\n");

  const priorActions = prior.actions.length
    ? prior.actions.map((a, i) => `  ${i + 1}. ${a}`).join("\n")
    : "  (none recorded)";

  return `SINCE LAST MONTH (period ${prior.period})
What we recommended last time:
${priorActions}
What moved this period vs last:
${lines}`;
}

export function buildBriefPrompt(data: BriefData, prior?: PriorReport): string {
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

  const priceDollars = (level: number | null): string =>
    level && level >= 1 && level <= 4 ? "$".repeat(level) : "unknown";

  const competitorSection =
    data.connections.competitors && data.competitors
      ? (() => {
          const c = data.competitors;
          // Fresh reports always set `comparable`; derive it for any legacy data.
          const comparable = c.comparable ?? {
            servicePrices: c.competitors.some((x) => x.services.length > 0),
            priceLevel: c.competitors.some((x) => x.priceLevel != null),
            rating: c.competitors.some((x) => x.rating > 0),
          };
          // Only describe metrics the server flagged as comparable across this set.
          const rows = c.competitors
            .map((comp) => {
              const dist = comp.distanceKm != null ? `${comp.distanceKm}km away` : "nearby";
              const rating =
                comp.rating > 0 ? `${comp.rating}/5 (${comp.totalReviews} reviews)` : "no rating";
              const price = comparable.priceLevel
                ? `, price level ${priceDollars(comp.priceLevel)}`
                : "";
              const services =
                comparable.servicePrices && comp.services.length
                  ? `; approx prices: ${comp.services.map((s) => `${s.name} ${s.raw}`).join(", ")}`
                  : "";
              return `  - ${comp.name}: ${dist}, ${rating}${price}${services}`;
            })
            .join("\n");

          // Pricing framing depends on what's actually comparable. When no
          // competitor exposes prices there is nothing to compare on price, so we
          // do NOT dump the owner's price list — we tell the model the useful,
          // honest angle instead.
          const pricingLine = comparable.servicePrices
            ? `- Your own published prices (for comparison): ${
                c.ownServices.length
                  ? c.ownServices.map((s) => `${s.name} ${s.raw}`).join("; ")
                  : "not published on your own site"
              }`
            : `- PRICE COMPARISON UNAVAILABLE: none of these nearby salons publish prices we could read, so there is nothing to compare on price. Do NOT present a price comparison or quote rival prices. The only honest price angle here is that publishing clear prices on the owner's own site is a way to stand out, since rivals don't — mention this only if it's genuinely useful.`;

          return `COMPETITOR LANDSCAPE (${c.competitors.length} nearby ${c.competitors.length === 1 ? "business" : "businesses"}, currency ${c.currency})
- Comparable metrics across this set: rating=${comparable.rating ? "yes" : "no"}, price band=${comparable.priceLevel ? "yes" : "no"}, published prices=${comparable.servicePrices ? "yes" : "no"}. ONLY draw comparisons on metrics marked "yes".
${pricingLine}
- Nearby competitors (nearest first):
${rows || "  - No competitors found"}`;
        })()
      : "";

  const priorSection = buildPriorSection(data, prior);

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
${
  competitorSection
    ? `
${competitorSection}
`
    : ""
}${
  priorSection
    ? `
${priorSection}
`
    : ""
}
HOW TO ANALYSE — think like a growth analyst, not a cheerleader:
- Prioritise the 3 actions by impact, not by ease. NEVER recommend editing or "optimising" a page that got negligible traffic (a few views) — that is wasted effort. Put the actions where the visitors and the money actually are.
- Drop-off: if one page (usually the homepage) holds the large majority of views while other pages get almost none, visitors are not progressing. The high-value fix is a clearer next step FROM that page (prices, booking, gallery) — not editing the deep pages nobody reaches.
- Search CTR gaps are the biggest opportunity: when a query ranks in the top ~3 positions but its CTR is low (well under ~10%), the ranking is being wasted — usually a Google Maps/local pack or a weak title/description sits above the listing. Call these out by name.
- Two different "listings", do NOT conflate them: (a) the website's own Google search result, controlled by the page TITLE TAG and META DESCRIPTION on the site; (b) the Google Business Profile / Google Maps listing, edited inside Google Business Profile, NOT on the website. For LOCAL searches ("hairdresser <suburb>", "<service> near me") the Maps local pack usually sits above the website link, so the high-leverage fix is the Business Profile listing (photos, services, a current offer, posts) — NOT the website headline. Only recommend website title/meta edits for NON-local, informational queries where the blue link actually competes. Always name which listing you mean in plain words.
- Brand vs non-brand: the business's own name converting well is expected and not an achievement. Real growth comes from winning non-brand local searches ("hairdresser <suburb>", "<service> near me"). Judge those on their own merits.
- Conversion blind spot: if customer actions (calls, directions, bookings) are NOT MEASURED, you may note ONCE in the summary prose that off-site actions aren't tracked yet. But when website traffic (GA4) IS connected, linking analytics / connecting a data feed / "getting your web person to connect tracking" is BANNED from the actions array entirely — it is not action #1, #2, or #3. Owners cannot self-serve it and the data we already have (website visits, search, reputation) is enough to give three real, owner-doable actions. The ONLY time a measurement-setup step may be an action is when WEBSITE TRAFFIC is NOT CONNECTED (then connecting Google Analytics is allowed as the top action).
- Treat very large month-on-month changes (≥ ~100%) with caution: they usually mean the prior month was only partially tracked. Frame it as establishing a baseline, not as real growth.
- CLOSE THE LOOP (only if a SINCE LAST MONTH section is present): open the summary by briefly referencing what you recommended last time and what actually moved — owner-to-owner, e.g. "Last month we said to add a clear booking button and chase a few reviews; here's how it played out." Give honest credit where a metric improved, and where it didn't move, treat it as unfinished rather than a failure (the owner may not have gotten to it, or it needs more time). If a past action clearly worked, say so and consider whether to double down; if a past action clearly did nothing after a fair chance, don't just repeat it — pivot to a different lever. Keep this to a sentence or two; do not turn the whole brief into a retrospective. Never invent a cause-and-effect link you can't support from the numbers.
- COMPETITOR LANDSCAPE (only if that section is present): use it for positioning, not price warfare. All competitor prices are APPROXIMATE, scraped from their public websites and often incomplete — NEVER claim you are cheaper/pricier than a named rival by an exact amount, and never state a competitor's exact price as fact. Frame it in plain positioning terms ("there are a few salons within a couple of kilometres; on the prices we could see, you sit mid-range" or "you're the priciest nearby but also the best-rated, which is a story worth telling"). The Google "price level" is a rough $–$$$$ band, not a real price. If prices weren't published, say the useful thing is simply that customers can't compare — which is an argument for putting YOUR prices clearly on your own site. At MOST ONE of the 3 actions may be about competitor positioning, and it must still be something the owner can do themselves (e.g. publish/clarify prices, lean into a rating advantage in their listing) — never "undercut competitor X".
- EXPLAIN RATING DIFFERENCES using review VOLUME, never stars alone. A rival showing 5.0 from 30–50 reviews is a THINNER, less trustworthy signal than the owner's rating from a much larger pile of reviews — a perfect score is easy to hold on few reviews and Google rounds up (a 4.96 shows as 5.0). When a nearby competitor out-stars the owner but on far fewer reviews, say so plainly in the summary in one honest sentence (e.g. "A couple of nearby salons show a perfect 5.0, but that's off 30-odd reviews — your 4.9 from 129 is actually the stronger, more believable signal because it's earned over many more customers"). Do NOT alarm the owner about a higher-rated rival when the owner has far more reviews; frame the owner's review depth as the advantage. Only flag a genuine reputation gap when a rival beats the owner on BOTH rating AND comparable-or-greater review volume.
- LEARN FROM COMPETITORS: look at what nearby rivals do and, where it's genuinely useful, turn it into ONE concrete improvement the owner can copy themselves — e.g. rivals publish clear price lists (so should you), rivals have far more Google reviews (so make review-asking a habit), rivals post regular offers/photos on their listing (so should you). Keep it owner-doable and specific; never suggest matching a competitor's prices or anything requiring a developer. This may be the competitor-positioning action, but do not force it if the biggest wins lie elsewhere in the data.
- WHAT THE PRICE PICTURE MEANS FOR THE OWNER (explain the SO-WHAT, don't just list prices): decide which of these situations applies and give the owner the plain-English takeaway plus what to do about it.
  • The owner publishes prices but nearby rivals DON'T (very common): this is a genuine advantage, not a worry. Shoppers comparing salons can see the owner's prices at a glance while rivals force a phone call — say this is a trust/convenience edge worth leaning into, and the action is to feature the price list prominently (a clear link/button), always shown NEXT TO the rating and review count so price is read alongside the trust signals, never alone.
  • The owner looks pricier than nearby rivals (higher published prices or a higher Google price band): do NOT tell them to cut prices. Frame it as premium positioning — pair the price with the proof (their strong rating and deep review count) so a visitor sees why they cost more. The risk to name honestly is that a price-sensitive shopper who sees price without the proof may bounce; the fix is presentation (price beside rating/reviews and a line on what makes them worth it), not discounting.
  • The owner looks cheaper than rivals: the opportunity is to make sure they aren't UNDER-charging for the quality their reviews prove — but never state this as fact from approximate data; raise it gently as a question worth their own judgement.
  • Nobody (including the owner) publishes prices: the useful takeaway is simply that customers can't compare on price anywhere, so being the FIRST to publish is a low-effort way to stand out. Keep all of this qualitative and honest — the prices are approximate and possibly incomplete, so never quote an exact head-to-head figure.

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

Write a plain-English summary for the owner (warm, concrete, no jargon) of about 3 short paragraphs, then exactly 3 actions written as described above, ordered most-valuable first. When a COMPETITOR LANDSCAPE section is present, work its story into the summary prose: where the owner stands among nearby rivals, and — if the ratings differ — one honest sentence explaining WHY (review volume, not stars alone, per the rule above).

Output ONLY valid JSON with no markdown fences, and use EXACTLY these three keys and no others — "summary", "actions", "subjectLine". The entire summary (all paragraphs) goes into the single "summary" string, separated by blank lines (\n\n). Do NOT split it into "summary2", "summary3", or any extra keys. "actions" must be an array of exactly 3 strings.

{
  "summary": "All 3 short paragraphs as ONE string, owner-to-owner, separated by \n\n: what happened this month, what's working, and the one thing holding growth back",
  "actions": ["Most valuable action — meaning, then the specific thing to do, then effort/payoff", "Second action, same structure", "Third action, same structure"],
  "subjectLine": "A plain, specific subject line — name the headline result, not generic praise"
}`;
}
