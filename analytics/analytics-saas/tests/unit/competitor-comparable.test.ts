import { describe, expect, it } from "vitest";
import { buildComparableCompetitorData } from "@/lib/services/analytics.service";
import type { Competitor } from "@/lib/types/brief";

function comp(overrides: Partial<Competitor>): Competitor {
  return {
    placeId: "p",
    name: "Rival",
    websiteUri: "https://r.example/",
    googleMapsUri: "https://maps.example/",
    distanceKm: 1,
    rating: 4.5,
    totalReviews: 50,
    priceLevel: null,
    services: [],
    servicesSource: "none",
    ...overrides,
  };
}

const ownPrices = [{ name: "Men's Cut", price: 68, raw: "from $68" }];

describe("buildComparableCompetitorData", () => {
  it("keeps prices when at least one competitor exposes them", () => {
    const data = buildComparableCompetitorData(
      "AUD",
      [comp({ services: [{ name: "Cut", price: 40, raw: "$40" }], servicesSource: "website" })],
      ownPrices,
    );
    expect(data.comparable?.servicePrices).toBe(true);
    expect(data.ownServices).toEqual(ownPrices);
    expect(data.competitors[0].services).toHaveLength(1);
  });

  it("strips ALL prices (owner + rivals) when no competitor exposes prices", () => {
    const data = buildComparableCompetitorData(
      "AUD",
      [comp({ services: [], priceLevel: null }), comp({ services: [], priceLevel: null })],
      ownPrices,
    );
    expect(data.comparable?.servicePrices).toBe(false);
    // Owner's own list is a comparison input only — dropped when nothing to compare.
    expect(data.ownServices).toEqual([]);
    expect(data.competitors.every((c) => c.services.length === 0)).toBe(true);
  });

  it("nulls price bands when no competitor has one, keeps them when one does", () => {
    const none = buildComparableCompetitorData("AUD", [comp({ priceLevel: null })], []);
    expect(none.comparable?.priceLevel).toBe(false);
    expect(none.competitors[0].priceLevel).toBeNull();

    const some = buildComparableCompetitorData(
      "AUD",
      [comp({ priceLevel: 2 }), comp({ priceLevel: null })],
      [],
    );
    expect(some.comparable?.priceLevel).toBe(true);
    expect(some.competitors[0].priceLevel).toBe(2);
  });

  it("flags rating comparability from any real rating", () => {
    const noRatings = buildComparableCompetitorData("AUD", [comp({ rating: 0 })], []);
    expect(noRatings.comparable?.rating).toBe(false);
    const withRating = buildComparableCompetitorData("AUD", [comp({ rating: 4.9 })], []);
    expect(withRating.comparable?.rating).toBe(true);
  });
});
