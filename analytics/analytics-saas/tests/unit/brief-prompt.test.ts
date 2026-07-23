import { describe, expect, it } from "vitest";
import { buildBriefPrompt } from "@/lib/prompts/brief";
import type { BriefData, CompetitorData, PriorReport } from "@/lib/types/brief";

const competitors: CompetitorData = {
  currency: "GBP",
  ownServices: [{ name: "Men's Cut", price: 30, raw: "£30" }],
  competitors: [
    {
      placeId: "ChIJ_rival",
      name: "Rival Cuts",
      websiteUri: "https://rival.example/",
      googleMapsUri: "https://maps.google.com/?cid=2",
      distanceKm: 1.2,
      rating: 4.3,
      totalReviews: 40,
      priceLevel: 2,
      services: [{ name: "Men's Cut", price: 35, raw: "from £35" }],
      servicesSource: "website",
    },
  ],
  comparable: { servicePrices: true, priceLevel: true, rating: true },
};

function baseData(overrides: Partial<BriefData> = {}): BriefData {
  return {
    businessName: "Terence London",
    period: "2026-05-01 to 2026-05-31",
    website: {
      sessions: 100,
      sessionsDelta: 5,
      topPages: [],
      trafficSources: [],
      engagementRate: 0.6,
    },
    search: { impressions: 1000, clicks: 50, ctr: 0.05, avgPosition: 4, topQueries: [] },
    local: {
      calls: 0,
      directions: 0,
      websiteClicks: 0,
      bookings: 0,
      totalInteractions: 0,
      interactionsDelta: 0,
    },
    reputation: { averageRating: 4.9, totalReviews: 120, newReviewsThisMonth: 1, newReviews: [] },
    connections: { ga4: true, gbp: true, competitors: false },
    ...overrides,
  };
}

describe("buildBriefPrompt competitor section", () => {
  it("omits the COMPETITOR LANDSCAPE data section when not connected", () => {
    const prompt = buildBriefPrompt(
      baseData({ connections: { ga4: true, gbp: true, competitors: false } }),
    );
    // The analysis rule always mentions the section name; the DATA block is keyed
    // by the "(N nearby …)" header, which must be absent when disconnected.
    expect(prompt).not.toContain("nearby businesses, currency");
    expect(prompt).not.toContain("nearby business, currency");
  });

  it("includes the section, own prices, and competitor prices when connected", () => {
    const prompt = buildBriefPrompt(
      baseData({ competitors, connections: { ga4: true, gbp: true, competitors: true } }),
    );
    expect(prompt).toContain("COMPETITOR LANDSCAPE (1 nearby business, currency GBP)");
    expect(prompt).toContain("Rival Cuts");
    expect(prompt).toContain("1.2km away");
    expect(prompt).toContain("from £35");
    expect(prompt).toContain("Men's Cut £30"); // owner's own published price
    expect(prompt).toContain("price level $$"); // priceLevel 2 → $$
  });

  it("omits price comparison when no competitor exposes prices", () => {
    // Rivals with no scraped prices AND no price band → nothing to compare on
    // price. The prompt must NOT dump the owner's price list or a price column.
    const noPrice: CompetitorData = {
      currency: "AUD",
      ownServices: [], // stripped by the service when not comparable
      competitors: [
        {
          placeId: "ChIJ_a",
          name: "Azzy Hair",
          websiteUri: "https://azzy.example/",
          googleMapsUri: "https://maps.google.com/?cid=9",
          distanceKm: 0.3,
          rating: 4.8,
          totalReviews: 184,
          priceLevel: null,
          services: [],
          servicesSource: "none",
        },
      ],
      comparable: { servicePrices: false, priceLevel: false, rating: true },
    };
    const prompt = buildBriefPrompt(
      baseData({ competitors: noPrice, connections: { ga4: true, gbp: true, competitors: true } }),
    );
    expect(prompt).toContain("PRICE COMPARISON UNAVAILABLE");
    expect(prompt).toContain("published prices=no");
    expect(prompt).toContain("price band=no");
    // The per-rival DATA row must not carry a price band or scraped prices.
    // ("price level" also appears in the static rules, so target the data row.)
    expect(prompt).not.toContain("Azzy Hair: 0.3km away, 4.8/5 (184 reviews), price level");
    expect(prompt).not.toContain("approx prices");
    // Owner's price list must not be dumped when there's nothing to compare.
    expect(prompt).not.toContain("Your own published prices (for comparison)");
  });

  it("instructs the model to explain rating gaps by review volume and to learn from rivals", () => {
    // These analysis rules ship in every prompt, but they are what makes the
    // report explain WHY a 5.0-from-30 differs from a 4.9-from-129 and mine
    // competitors for owner-doable improvements.
    const prompt = buildBriefPrompt(baseData());
    expect(prompt).toContain("EXPLAIN RATING DIFFERENCES using review VOLUME");
    expect(prompt).toContain("LEARN FROM COMPETITORS");
    expect(prompt).toContain("WHAT THE PRICE PICTURE MEANS FOR THE OWNER");
  });

  it("adds the approximate-pricing positioning rule only when connected", () => {
    const off = buildBriefPrompt(baseData());
    const on = buildBriefPrompt(
      baseData({ competitors, connections: { ga4: true, gbp: true, competitors: true } }),
    );
    // The analysis rule text is always in the prompt (rules block), but the data
    // section is what gates behaviour; assert the section presence differs.
    expect(off).not.toContain("Nearby competitors (nearest first)");
    expect(on).toContain("Nearby competitors (nearest first)");
  });

  it("omits the SINCE LAST MONTH section when there is no prior report", () => {
    const prompt = buildBriefPrompt(baseData());
    // The rule text mentions the section name; the DATA block is keyed by the
    // "(period ...)" header, which must be absent with no prior report.
    expect(prompt).not.toContain("SINCE LAST MONTH (period");
  });

  it("includes prior actions and real deltas when a prior report is supplied", () => {
    const prior: PriorReport = {
      period: "2026-04-01_to_2026-04-30",
      actions: ["Add a clear booking button", "Ask 3 clients for reviews", "Post a photo"],
      metrics: { sessions: 80, searchClicks: 40, averageRating: 4.9, totalReviews: 100 },
    };
    // baseData has sessions 100, search.clicks 50, rating 4.9, reviews 120.
    const prompt = buildBriefPrompt(baseData(), prior);
    expect(prompt).toContain("SINCE LAST MONTH (period 2026-04-01_to_2026-04-30)");
    expect(prompt).toContain("Add a clear booking button");
    expect(prompt).toContain("Website visits: 80 \u2192 100, up (+25%)");
    expect(prompt).toContain("Search clicks: 40 \u2192 50, up (+25%)");
    expect(prompt).toContain("Total reviews: 100 \u2192 120, up (+20%)");
    expect(prompt).toContain("CLOSE THE LOOP");
  });

  it("marks a metric with no comparable prior figure instead of inventing a delta", () => {
    const prior: PriorReport = {
      period: "2026-04-01_to_2026-04-30",
      actions: ["Do the thing"],
      metrics: { sessions: null, searchClicks: 40, averageRating: null, totalReviews: null },
    };
    const prompt = buildBriefPrompt(baseData(), prior);
    expect(prompt).toContain("Website visits: 100 (no comparable figure last month)");
  });
});
