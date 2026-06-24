/**
 * Live test: pull real public review data via the Places API (New).
 *
 *   npx tsx scripts/test-places.ts ["Business Name Suburb"]
 *
 * Defaults to Terence Salon (terencelondon.com.au). Requires GOOGLE_MAPS_API_KEY
 * in .env.local (a self-service Maps key with the Places API enabled).
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(".env.local") });

import { fetchPlacesReputation } from "@/lib/clients/places";

function lastNDays(n: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function main() {
  const query = process.argv[2] || "Terence Salon Templestowe";
  const { start, end } = lastNDays(30);

  console.log(`\n=== Places reputation test ===`);
  console.log(`query : ${query}`);
  console.log(`period: ${start} → ${end}\n`);

  const rep = await fetchPlacesReputation(query, start, end);

  if (!rep) {
    console.log("⚠️  No place matched that query. Try a more specific name + suburb.");
    return;
  }

  console.log(`📍 Matched: ${rep.displayName}`);
  console.log(`   website : ${rep.websiteUri || "(none)"}`);
  console.log(`   maps    : ${rep.googleMapsUri || "(none)"}`);
  console.log(`   placeId : ${rep.placeId}\n`);
  console.log(`⭐ ${rep.averageRating} average across ${rep.totalReviews} reviews`);
  console.log(`🆕 ${rep.newReviewsThisMonth} of the returned reviews fall in the period\n`);
  console.log(JSON.stringify(rep.newReviews, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
