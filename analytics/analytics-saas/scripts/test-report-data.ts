/**
 * Live end-to-end proof of the analytics pipeline's reputation wiring.
 * Runs the real fetchAnalyticsData() for a stored config and prints the
 * reputation block + connection flags. No LLM call, no writes.
 *
 *   npx tsx scripts/test-report-data.ts [configId]
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(".env.local") });

import { eq } from "drizzle-orm";
import { getValidTokens } from "@/lib/auth/google-oauth";
import { db } from "@/lib/db";
import { reportConfigs } from "@/lib/db/schema";
import { fetchAnalyticsData } from "@/lib/services/analytics.service";

const DEFAULT_CONFIG = "cfg_usr_1781791417363_ocvw8ip_1781852955823"; // terencelondon, connected user

function lastNDays(n: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function main() {
  const configId = process.argv[2] || DEFAULT_CONFIG;
  const cfg = await db.query.reportConfigs.findFirst({ where: eq(reportConfigs.id, configId) });
  if (!cfg) throw new Error(`Config ${configId} not found`);

  console.log(`\n=== Report data pipeline ===`);
  console.log(`business    : ${cfg.businessName}`);
  console.log(`gscSiteUrl  : ${cfg.gscSiteUrl}`);
  console.log(`gbpLocation : ${cfg.gbpLocationId ?? "(none → Places fallback)"}\n`);

  const tokens = await getValidTokens(cfg.userId);
  const { start, end } = lastNDays(30);

  const data = await fetchAnalyticsData(
    cfg.businessName,
    cfg.ga4PropertyId ?? undefined,
    cfg.gscSiteUrl ?? "",
    cfg.gbpLocationId ?? undefined,
    tokens,
    start,
    end,
    cfg.placeId ?? undefined,
    cfg.businessType ?? undefined,
  );

  console.log("connections:", JSON.stringify(data.connections));
  console.log("competitors:", JSON.stringify(data.competitors, null, 2));
  console.log("reputation :", JSON.stringify(data.reputation, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
