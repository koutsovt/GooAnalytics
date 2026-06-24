import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPlacesReputation } from "@/lib/clients/places";

vi.mock("@/lib/env", () => ({
  env: { GOOGLE_MAPS_API_KEY: "test-key" },
}));

const PERIOD_START = "2026-05-01";
const PERIOD_END = "2026-05-31";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("fetchPlacesReputation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to the Places searchText endpoint with key, field mask, and query", async () => {
    const fetchMock = mockFetchOnce(200, {
      places: [{ id: "p1", rating: 4.5, userRatingCount: 10, reviews: [] }],
    });

    await fetchPlacesReputation("Terence Salon Templestowe", PERIOD_START, PERIOD_END);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(init.headers["X-Goog-FieldMask"]).toContain("places.reviews");
    expect(init.headers["X-Goog-FieldMask"]).toContain("places.userRatingCount");
    expect(JSON.parse(init.body)).toEqual({
      textQuery: "Terence Salon Templestowe",
      pageSize: 1,
    });
  });

  it("maps rating/count and rounds the average from the matched place", async () => {
    mockFetchOnce(200, {
      places: [{ id: "p1", displayName: { text: "Terence Salon" }, rating: 4.66, userRatingCount: 213, reviews: [] }],
    });

    const rep = await fetchPlacesReputation("Terence Salon", PERIOD_START, PERIOD_END);

    expect(rep).not.toBeNull();
    expect(rep!.displayName).toBe("Terence Salon");
    expect(rep!.averageRating).toBe(4.7);
    expect(rep!.totalReviews).toBe(213);
  });

  it("filters returned reviews to the reporting period and prefers text over originalText", async () => {
    mockFetchOnce(200, {
      places: [
        {
          id: "p1",
          rating: 5,
          userRatingCount: 4,
          reviews: [
            { rating: 5, text: { text: "In period" }, publishTime: "2026-05-10T09:00:00Z" },
            { rating: 1, text: { text: "Too old" }, publishTime: "2026-04-15T09:00:00Z" },
            { rating: 4, originalText: { text: "Fallback text" }, publishTime: "2026-05-20T09:00:00Z" },
            { rating: 3, text: { text: "Future" }, publishTime: "2026-06-05T09:00:00Z" },
          ],
        },
      ],
    });

    const rep = await fetchPlacesReputation("x", PERIOD_START, PERIOD_END);

    expect(rep!.newReviewsThisMonth).toBe(2);
    expect(rep!.newReviews).toEqual([
      { rating: 5, text: "In period", date: "2026-05-10T09:00:00Z" },
      { rating: 4, text: "Fallback text", date: "2026-05-20T09:00:00Z" },
    ]);
  });

  it("returns null when no place matches", async () => {
    mockFetchOnce(200, { places: [] });

    const rep = await fetchPlacesReputation("nonexistent", PERIOD_START, PERIOD_END);

    expect(rep).toBeNull();
  });

  it("throws with status and detail on an API error", async () => {
    mockFetchOnce(403, { error: { message: "PERMISSION_DENIED" } });

    await expect(fetchPlacesReputation("x", PERIOD_START, PERIOD_END)).rejects.toThrow(
      /Places searchText failed \(403\)/,
    );
  });
});
