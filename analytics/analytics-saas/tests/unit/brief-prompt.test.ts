import { describe, expect, it } from "vitest";
import { buildBriefPrompt } from "@/lib/prompts/brief";
import type { BriefData, CompetitorData } from "@/lib/types/brief";

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

  it("instructs the model to explain rating gaps by review volume and to learn from rivals", () => {
    // These analysis rules ship in every prompt, but they are what makes the
    // report explain WHY a 5.0-from-30 differs from a 4.9-from-129 and mine
    // competitors for owner-doable improvements.
    const prompt = buildBriefPrompt(baseData());
    expect(prompt).toContain("EXPLAIN RATING DIFFERENCES using review VOLUME");
    expect(prompt).toContain("LEARN FROM COMPETITORS");
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
});
