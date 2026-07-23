import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractServicePrices, findNearbyCompetitors } from "@/lib/clients/competitors";
import { fetchPlacePrimaryType } from "@/lib/clients/places";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";

vi.mock("@/lib/clients/ga4", () => ({
  fetchGA4Data: vi.fn().mockResolvedValue({
    website: { sessions: 0, sessionsDelta: 0, topPages: [], trafficSources: [], engagementRate: 0 },
    local: {
      calls: 0,
      directions: 0,
      websiteClicks: 0,
      bookings: 0,
      totalInteractions: 0,
      interactionsDelta: 0,
    },
  }),
}));
vi.mock("@/lib/clients/gsc", () => ({
  fetchGSCData: vi
    .fn()
    .mockResolvedValue({ impressions: 0, clicks: 0, ctr: 0, avgPosition: 0, topQueries: [] }),
}));
vi.mock("@/lib/clients/gbp", () => ({ fetchReputationData: vi.fn() }));
vi.mock("@/lib/clients/places", () => ({
  fetchPlacesReputation: vi.fn().mockResolvedValue(null),
  fetchPlacesReputationByPlaceId: vi.fn().mockResolvedValue(null),
  fetchPlacePrimaryType: vi.fn().mockResolvedValue(""),
}));
vi.mock("@/lib/clients/competitors", () => ({
  findNearbyCompetitors: vi.fn(),
  extractServicePrices: vi.fn(),
}));

const envMock = { GOOGLE_MAPS_API_KEY: "test-key", COMPETITOR_PRICES_ENABLED: false };
vi.mock("@/lib/env", () => ({
  get env() {
    return envMock;
  },
}));

const tokens = { accessToken: "a", refreshToken: "r", expiryDate: Date.now() + 3600_000 };
const SITE = "https://terencelondon.com.au/";
const START = "2026-05-01";
const END = "2026-05-31";

const competitor = {
  placeId: "ChIJ_rival",
  name: "Rival Cuts",
  websiteUri: "https://rival.example/",
  googleMapsUri: "https://maps.google.com/?cid=2",
  distanceKm: 1.2,
  rating: 4.3,
  totalReviews: 40,
  priceLevel: 2,
  services: [],
  servicesSource: "none" as const,
};

async function run(placeId: string | undefined, businessType?: string) {
  return fetchAnalyticsData(
    "Terence London",
    undefined,
    SITE,
    undefined,
    tokens,
    START,
    END,
    placeId,
    businessType,
  );
}

describe("fetchAnalyticsData competitor resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPlacePrimaryType).mockResolvedValue("");
    envMock.GOOGLE_MAPS_API_KEY = "test-key";
    envMock.COMPETITOR_PRICES_ENABLED = false;
  });

  it("populates competitors and sets connections.competitors when discovery finds rivals", async () => {
    vi.mocked(findNearbyCompetitors).mockResolvedValue([{ ...competitor }]);

    const data = await run("ChIJ_owner", "hairdresser");

    expect(findNearbyCompetitors).toHaveBeenCalledWith("ChIJ_owner", "hairdresser", "ChIJ_owner");
    expect(data.connections.competitors).toBe(true);
    expect(data.competitors?.competitors).toHaveLength(1);
    expect(data.competitors?.competitors[0].name).toBe("Rival Cuts");
    // Layer 2 off → no scraping, empty owner services.
    expect(extractServicePrices).not.toHaveBeenCalled();
    expect(data.competitors?.ownServices).toEqual([]);
  });

  it("backfills the query from Google's primary category when no businessType is stored", async () => {
    vi.mocked(fetchPlacePrimaryType).mockResolvedValue("Hair Salon");
    vi.mocked(findNearbyCompetitors).mockResolvedValue([{ ...competitor }]);
    await run("ChIJ_owner");
    expect(fetchPlacePrimaryType).toHaveBeenCalledWith("ChIJ_owner");
    expect(findNearbyCompetitors).toHaveBeenCalledWith("ChIJ_owner", "Hair Salon", "ChIJ_owner");
  });

  it("skips discovery when no businessType and no Google category are available", async () => {
    vi.mocked(fetchPlacePrimaryType).mockResolvedValue("");
    const data = await run("ChIJ_owner");
    expect(findNearbyCompetitors).not.toHaveBeenCalled();
    expect(data.competitors).toBeUndefined();
    expect(data.connections.competitors).toBe(false);
  });

  it("enriches with scraped prices when COMPETITOR_PRICES_ENABLED is on", async () => {
    envMock.COMPETITOR_PRICES_ENABLED = true;
    vi.mocked(findNearbyCompetitors).mockResolvedValue([{ ...competitor }]);
    vi.mocked(extractServicePrices)
      .mockResolvedValueOnce({
        currency: "GBP",
        services: [{ name: "Men's Cut", price: 30, raw: "£30" }],
      })
      .mockResolvedValueOnce({
        currency: "GBP",
        services: [{ name: "Men's Cut", price: 35, raw: "£35" }],
      });

    const data = await run("ChIJ_owner", "hairdresser");

    expect(extractServicePrices).toHaveBeenCalledTimes(2); // owner + 1 competitor
    expect(data.competitors?.ownServices).toEqual([{ name: "Men's Cut", price: 30, raw: "£30" }]);
    expect(data.competitors?.competitors[0].services).toEqual([
      { name: "Men's Cut", price: 35, raw: "£35" },
    ]);
    expect(data.competitors?.competitors[0].servicesSource).toBe("website");
  });

  it("leaves competitors undefined and disconnected when there is no owner placeId", async () => {
    const data = await run(undefined, "hairdresser");
    expect(findNearbyCompetitors).not.toHaveBeenCalled();
    expect(data.competitors).toBeUndefined();
    expect(data.connections.competitors).toBe(false);
  });

  it("leaves competitors undefined when there is no Maps key", async () => {
    envMock.GOOGLE_MAPS_API_KEY = "";
    const data = await run("ChIJ_owner", "hairdresser");
    expect(findNearbyCompetitors).not.toHaveBeenCalled();
    expect(data.competitors).toBeUndefined();
    expect(data.connections.competitors).toBe(false);
  });

  it("never sinks the report when discovery throws — competitors undefined", async () => {
    vi.mocked(findNearbyCompetitors).mockRejectedValue(new Error("403 PERMISSION_DENIED"));
    const data = await run("ChIJ_owner", "hairdresser");
    expect(data.competitors).toBeUndefined();
    expect(data.connections.competitors).toBe(false);
    // Rest of the report still assembles.
    expect(data.businessName).toBe("Terence London");
  });

  it("leaves competitors undefined when discovery returns an empty list", async () => {
    vi.mocked(findNearbyCompetitors).mockResolvedValue([]);
    const data = await run("ChIJ_owner", "hairdresser");
    expect(data.competitors).toBeUndefined();
    expect(data.connections.competitors).toBe(false);
  });
});
