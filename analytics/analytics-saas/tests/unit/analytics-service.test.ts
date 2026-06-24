import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchReputationData } from "@/lib/clients/gbp";
import { fetchPlacesReputation } from "@/lib/clients/places";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";

// Only the reputation-resolution path is under test, so GA4/GSC are stubbed to
// constant shapes and GBP/Places are the controllable seams.
vi.mock("@/lib/clients/ga4", () => ({
  fetchGA4Data: vi.fn().mockResolvedValue({
    website: { sessions: 0, sessionsDelta: 0, topPages: [], trafficSources: [], engagementRate: 0 },
    local: { calls: 0, directions: 0, websiteClicks: 0, bookings: 0, totalInteractions: 0, interactionsDelta: 0 },
  }),
}));
vi.mock("@/lib/clients/gsc", () => ({
  fetchGSCData: vi.fn().mockResolvedValue({
    impressions: 0, clicks: 0, ctr: 0, avgPosition: 0, topQueries: [],
  }),
}));
vi.mock("@/lib/clients/gbp", () => ({ fetchReputationData: vi.fn() }));
vi.mock("@/lib/clients/places", () => ({ fetchPlacesReputation: vi.fn() }));

const envMock = { GOOGLE_MAPS_API_KEY: "test-key" };
vi.mock("@/lib/env", () => ({ get env() { return envMock; } }));

const tokens = { accessToken: "a", refreshToken: "r", expiryDate: Date.now() + 3600_000 };
const SITE = "https://terencelondon.com.au/";
const START = "2026-05-01";
const END = "2026-05-31";

const ownerRep = { averageRating: 4.5, totalReviews: 50, newReviewsThisMonth: 2, newReviews: [] };
const placesRep = {
  placeId: "ChIJ_x",
  displayName: "TERENCE LONDON",
  websiteUri: "https://terencelondon.com.au/",
  googleMapsUri: "https://maps.google.com/?cid=1",
  averageRating: 4.9,
  totalReviews: 128,
  newReviewsThisMonth: 1,
  newReviews: [{ rating: 5, text: "Great", date: "2026-05-28T07:50:13Z" }],
};

describe("fetchAnalyticsData reputation resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.GOOGLE_MAPS_API_KEY = "test-key";
  });

  it("uses Business Profile v4 when a location id is set, and never calls Places", async () => {
    vi.mocked(fetchReputationData).mockResolvedValue(ownerRep);

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, "accounts/1/locations/2", tokens, START, END,
    );

    expect(fetchReputationData).toHaveBeenCalledOnce();
    expect(fetchPlacesReputation).not.toHaveBeenCalled();
    expect(data.connections.gbp).toBe(true);
    expect(data.reputation).toEqual(ownerRep);
  });

  it("falls back to Places when no location id and the website host matches", async () => {
    vi.mocked(fetchPlacesReputation).mockResolvedValue(placesRep);

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, undefined, tokens, START, END,
    );

    expect(fetchReputationData).not.toHaveBeenCalled();
    expect(fetchPlacesReputation).toHaveBeenCalledWith("terencelondon.com.au", START, END);
    expect(data.connections.gbp).toBe(true);
    expect(data.reputation).toEqual({
      averageRating: 4.9,
      totalReviews: 128,
      newReviewsThisMonth: 1,
      newReviews: [{ rating: 5, text: "Great", date: "2026-05-28T07:50:13Z" }],
    });
    // The Places-only extra fields must not leak into the brief reputation shape.
    expect(data.reputation).not.toHaveProperty("placeId");
  });

  it("rejects a Places match whose website is a different business (host guard)", async () => {
    vi.mocked(fetchPlacesReputation).mockResolvedValue({
      ...placesRep,
      websiteUri: "https://some-other-salon.com/",
    });

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, undefined, tokens, START, END,
    );

    expect(data.connections.gbp).toBe(false);
    expect(data.reputation).toEqual({
      averageRating: 0, totalReviews: 0, newReviewsThisMonth: 0, newReviews: [],
    });
  });

  it("treats a www-only difference as the same host", async () => {
    vi.mocked(fetchPlacesReputation).mockResolvedValue({
      ...placesRep,
      websiteUri: "https://www.terencelondon.com.au/",
    });

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, undefined, tokens, START, END,
    );

    expect(data.connections.gbp).toBe(true);
    expect(data.reputation.totalReviews).toBe(128);
  });

  it("returns disconnected zeros when no Maps key is configured", async () => {
    envMock.GOOGLE_MAPS_API_KEY = "";

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, undefined, tokens, START, END,
    );

    expect(fetchPlacesReputation).not.toHaveBeenCalled();
    expect(data.connections.gbp).toBe(false);
    expect(data.reputation.totalReviews).toBe(0);
  });

  it("never sinks the report when Places throws — falls back to zeros", async () => {
    vi.mocked(fetchPlacesReputation).mockRejectedValue(new Error("403 PERMISSION_DENIED"));

    const data = await fetchAnalyticsData(
      "terencelondon.com.au", undefined, SITE, undefined, tokens, START, END,
    );

    expect(data.connections.gbp).toBe(false);
    expect(data.reputation.totalReviews).toBe(0);
  });
});
