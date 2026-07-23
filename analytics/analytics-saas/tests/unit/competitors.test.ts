import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findNearbyCompetitors,
  haversineKm,
  htmlToText,
  mapPriceLevel,
  parseExtractResponse,
  robotsDisallowsRoot,
} from "@/lib/clients/competitors";

const envMock = {
  GOOGLE_MAPS_API_KEY: "test-key",
  COMPETITOR_PRICES_ENABLED: false,
  Z_AI_API_KEY: "",
};
vi.mock("@/lib/env", () => ({
  get env() {
    return envMock;
  },
}));

describe("haversineKm", () => {
  it("returns null when a coordinate is missing", () => {
    expect(haversineKm(null, { latitude: 1, longitude: 2 })).toBeNull();
    expect(haversineKm({ latitude: 1 }, { latitude: 1, longitude: 2 })).toBeNull();
    expect(haversineKm({ latitude: 1, longitude: 2 }, undefined)).toBeNull();
  });

  it("returns 0 for identical points", () => {
    expect(
      haversineKm({ latitude: 51.5, longitude: -0.12 }, { latitude: 51.5, longitude: -0.12 }),
    ).toBe(0);
  });

  it("computes a known distance (London ~ Paris ≈ 343km) within tolerance", () => {
    const d = haversineKm(
      { latitude: 51.5074, longitude: -0.1278 },
      { latitude: 48.8566, longitude: 2.3522 },
    );
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThan(330);
    expect(d!).toBeLessThan(360);
  });

  it("rounds to one decimal", () => {
    const d = haversineKm(
      { latitude: 51.5, longitude: -0.12 },
      { latitude: 51.51, longitude: -0.12 },
    );
    expect(d).not.toBeNull();
    expect(Number.isInteger(d! * 10)).toBe(true);
  });
});

describe("mapPriceLevel", () => {
  it("maps the Google enum to 1–4", () => {
    expect(mapPriceLevel("PRICE_LEVEL_INEXPENSIVE")).toBe(1);
    expect(mapPriceLevel("PRICE_LEVEL_MODERATE")).toBe(2);
    expect(mapPriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe(3);
    expect(mapPriceLevel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe(4);
  });

  it("returns null for free/unspecified/unknown/undefined", () => {
    expect(mapPriceLevel("PRICE_LEVEL_FREE")).toBeNull();
    expect(mapPriceLevel("PRICE_LEVEL_UNSPECIFIED")).toBeNull();
    expect(mapPriceLevel("GARBAGE")).toBeNull();
    expect(mapPriceLevel(undefined)).toBeNull();
  });
});

describe("parseExtractResponse", () => {
  it("parses a valid price list and strips ```json fences", () => {
    const res = parseExtractResponse(
      '```json\n{"currency":"GBP","services":[{"name":"Men\'s Cut","price":35,"raw":"from £35"}]}\n```',
    );
    expect(res).toEqual({
      currency: "GBP",
      services: [{ name: "Men's Cut", price: 35, raw: "from £35" }],
    });
  });

  it("returns empty services (not null) when the model reports no prices", () => {
    const res = parseExtractResponse('{"currency":"EUR","services":[]}');
    expect(res).toEqual({ currency: "EUR", services: [] });
  });

  it("drops entries with a missing name or non-positive price", () => {
    const res = parseExtractResponse(
      '{"currency":"GBP","services":[{"name":"","price":10,"raw":"£10"},{"name":"Wash","price":0,"raw":"free"},{"name":"Cut","price":20,"raw":"£20"}]}',
    );
    expect(res!.services).toEqual([{ name: "Cut", price: 20, raw: "£20" }]);
  });

  it("coerces numeric-string prices and defaults raw + currency", () => {
    const res = parseExtractResponse('{"services":[{"name":"Cut","price":"18.5"}]}');
    expect(res).toEqual({
      currency: "GBP",
      services: [{ name: "Cut", price: 18.5, raw: "18.5" }],
    });
  });

  it("returns null on malformed JSON", () => {
    expect(parseExtractResponse("not json at all")).toBeNull();
    expect(parseExtractResponse("[1,2,3")).toBeNull();
  });
});

describe("robotsDisallowsRoot", () => {
  it("detects a blanket disallow for *", () => {
    expect(robotsDisallowsRoot("User-agent: *\nDisallow: /")).toBe(true);
  });

  it("allows when only specific paths are disallowed", () => {
    expect(robotsDisallowsRoot("User-agent: *\nDisallow: /admin")).toBe(false);
  });

  it("allows when the disallow targets an unrelated bot", () => {
    expect(robotsDisallowsRoot("User-agent: BadBot\nDisallow: /")).toBe(false);
  });

  it("allows an empty robots file", () => {
    expect(robotsDisallowsRoot("")).toBe(false);
  });
});

describe("htmlToText", () => {
  it("strips scripts, styles, and tags, decoding £", () => {
    const text = htmlToText(
      "<style>.a{}</style><script>x()</script><h1>Cuts</h1><p>Men&pound;s cut &#163;35</p>",
    );
    expect(text).toContain("Cuts");
    expect(text).toContain("£35");
    expect(text).not.toContain("x()");
    expect(text).not.toContain("<h1>");
  });
});

describe("findNearbyCompetitors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.GOOGLE_MAPS_API_KEY = "test-key";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("excludes the owner, computes distance, sorts nearest-first, and caps", async () => {
    // First call: place-location details for the anchor. Then: searchText.
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ location: { latitude: 51.5, longitude: -0.12 } }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          places: [
            {
              id: "own",
              displayName: { text: "Me" },
              location: { latitude: 51.5, longitude: -0.12 },
            },
            {
              id: "far",
              displayName: { text: "Far Salon" },
              location: { latitude: 51.6, longitude: -0.12 },
              rating: 4.2,
              userRatingCount: 30,
              priceLevel: "PRICE_LEVEL_EXPENSIVE",
            },
            {
              id: "near",
              displayName: { text: "Near Salon" },
              location: { latitude: 51.51, longitude: -0.12 },
              rating: 4.8,
              userRatingCount: 90,
              priceLevel: "PRICE_LEVEL_MODERATE",
            },
          ],
        }),
        text: async () => "",
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await findNearbyCompetitors("own", "hairdresser", "own", { maxResults: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].placeId).toBe("near");
    expect(result[0].name).toBe("Near Salon");
    expect(result[0].priceLevel).toBe(2);
    expect(result[0].distanceKm).not.toBeNull();
    expect(result.some((c) => c.placeId === "own")).toBe(false);
  });

  it("throws with status on an API error", async () => {
    // First fetch resolves the anchor location; the second (searchText) errors.
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ location: {} }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}),
        text: async () => "PERMISSION_DENIED",
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(findNearbyCompetitors("p", "salon", "p")).rejects.toThrow(/failed \(403\)/);
  });
});
