import { google } from "googleapis";
import type { GoogleTokens } from "@/lib/auth/google-oauth";
import { buildAuthClient } from "@/lib/auth/google-oauth";
import type { ReputationData } from "@/lib/types/brief";

const RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export async function fetchReputationData(
  locationId: string,
  tokens: GoogleTokens,
  periodStart: string,
  periodEnd: string,
): Promise<ReputationData> {
  const authClient = buildAuthClient(tokens);

  try {
    const reviews = (google as any).mybusinessreviews({ version: "v1", auth: authClient });
    const res = await (reviews as any).accounts.locations.reviews.list({
      parent: locationId,
      pageSize: 50,
    });

    const allReviews: any[] = res.data.reviews ?? [];
    const periodStartDate = new Date(periodStart);
    const periodEndDate = new Date(periodEnd);
    periodEndDate.setHours(23, 59, 59);

    const newReviews = allReviews
      .filter((r) => {
        const d = new Date(r.createTime);
        return d >= periodStartDate && d <= periodEndDate;
      })
      .map((r) => ({
        rating: RATING_MAP[r.starRating] ?? 0,
        text: r.comment ?? "",
        date: r.createTime ?? "",
      }));

    const totalReviews = allReviews.length;
    const ratingSum = allReviews.reduce(
      (sum: number, r: any) => sum + (RATING_MAP[r.starRating] ?? 0),
      0,
    );
    const averageRating = totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

    return {
      averageRating,
      totalReviews,
      newReviewsThisMonth: newReviews.length,
      newReviews: newReviews.slice(0, 5),
    };
  } catch (err: any) {
    console.warn("GBP reviews unavailable:", err?.message ?? err);
    return { averageRating: 0, totalReviews: 0, newReviewsThisMonth: 0, newReviews: [] };
  }
}
