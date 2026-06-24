import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuthClient } from "@/lib/auth/google-oauth";
import { fetchReputationData } from "@/lib/clients/gbp";

vi.mock("@/lib/auth/google-oauth", () => ({
  buildAuthClient: vi.fn(),
}));

const request = vi.fn();

const tokens = { accessToken: "a", refreshToken: "r", expiryDate: Date.now() + 3600_000 };
const LOCATION = "accounts/123/locations/456";
const PERIOD_START = "2026-05-01";
const PERIOD_END = "2026-05-31";

function mockReviewsResponse(data: Record<string, unknown>) {
  request.mockResolvedValue({ data });
}

describe("fetchReputationData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildAuthClient).mockReturnValue({ request } as never);
  });

  it("requests the My Business v4 reviews endpoint for the location", async () => {
    mockReviewsResponse({ reviews: [], averageRating: 0, totalReviewCount: 0 });

    await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(request).toHaveBeenCalledWith({
      url: `https://mybusiness.googleapis.com/v4/${LOCATION}/reviews`,
      params: { pageSize: 50 },
    });
  });

  it("uses the API aggregates for headline numbers and rounds the rating", async () => {
    mockReviewsResponse({ reviews: [], averageRating: 4.27, totalReviewCount: 128 });

    const result = await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(result.averageRating).toBe(4.3);
    expect(result.totalReviews).toBe(128);
  });

  it("counts and maps only reviews created within the reporting period", async () => {
    mockReviewsResponse({
      averageRating: 4.5,
      totalReviewCount: 4,
      reviews: [
        { starRating: "FIVE", comment: "Great", createTime: "2026-05-15T09:00:00Z" },
        { starRating: "ONE", comment: "Old", createTime: "2026-04-20T09:00:00Z" },
        { starRating: "FOUR", createTime: "2026-05-31T10:00:00Z" },
        { starRating: "THREE", comment: "Future", createTime: "2026-06-02T09:00:00Z" },
      ],
    });

    const result = await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(result.newReviewsThisMonth).toBe(2);
    expect(result.newReviews).toEqual([
      { rating: 5, text: "Great", date: "2026-05-15T09:00:00Z" },
      { rating: 4, text: "", date: "2026-05-31T10:00:00Z" },
    ]);
  });

  it("caps the new-review detail list at 5 while still counting all of them", async () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      starRating: "FIVE",
      comment: `r${i}`,
      createTime: `2026-05-${String(i + 1).padStart(2, "0")}T09:00:00Z`,
    }));
    mockReviewsResponse({ reviews, averageRating: 5, totalReviewCount: 7 });

    const result = await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(result.newReviewsThisMonth).toBe(7);
    expect(result.newReviews).toHaveLength(5);
  });

  it("defaults missing aggregates to zero", async () => {
    mockReviewsResponse({ reviews: [] });

    const result = await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(result).toEqual({
      averageRating: 0,
      totalReviews: 0,
      newReviewsThisMonth: 0,
      newReviews: [],
    });
  });

  it("returns zeros when the API request fails instead of throwing", async () => {
    request.mockRejectedValue(new Error("403 Forbidden"));

    const result = await fetchReputationData(LOCATION, tokens, PERIOD_START, PERIOD_END);

    expect(result).toEqual({
      averageRating: 0,
      totalReviews: 0,
      newReviewsThisMonth: 0,
      newReviews: [],
    });
  });
});
