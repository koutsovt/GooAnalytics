/**
 * One-off diagnostic: prove the Google Business Profile reviews path end-to-end
 * against real stored OAuth tokens.
 *
 *   npx tsx scripts/test-gbp.ts [userId] [locationResourceName]
 *
 * With no locationResourceName it discovers the accounts/locations the connected
 * Google account manages (the resource name the config form needs), then pulls
 * live reviews for each. Pass a known "accounts/{a}/locations/{l}" to test one.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(".env.local") });

import { google } from "googleapis";
import { buildAuthClient, getValidTokens } from "@/lib/auth/google-oauth";
import { fetchReputationData } from "@/lib/clients/gbp";

const DEFAULT_USER = "usr_1781791417363_ocvw8ip"; // koutsovt@gmail.com (connected)

function lastNDays(n: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function discoverLocations(authClient: ReturnType<typeof buildAuthClient>) {
  const accountMgmt = google.mybusinessaccountmanagement({ version: "v1", auth: authClient });
  const bizInfo = google.mybusinessbusinessinformation({ version: "v1", auth: authClient });

  const accountsRes = await accountMgmt.accounts.list({ pageSize: 20 });
  const accounts = accountsRes.data.accounts ?? [];
  console.log(`\n📒 Accounts found: ${accounts.length}`);

  const resourceNames: string[] = [];
  for (const acct of accounts) {
    console.log(`  • ${acct.name}  (${acct.accountName ?? "unnamed"}, type=${acct.type ?? "?"})`);
    const accountId = acct.name?.split("/").pop();
    if (!accountId) continue;

    const locRes = await bizInfo.accounts.locations.list({
      parent: acct.name!,
      readMask: "name,title,storefrontAddress,websiteUri",
      pageSize: 100,
    });
    const locations = locRes.data.locations ?? [];
    console.log(`    locations: ${locations.length}`);
    for (const loc of locations) {
      // bizInfo returns "locations/{id}"; the v4 reviews API needs the full
      // "accounts/{accountId}/locations/{id}" resource name.
      const locId = loc.name?.split("/").pop();
      const resourceName = `accounts/${accountId}/locations/${locId}`;
      console.log(
        `      - ${resourceName}  ::  ${loc.title ?? "?"}  ${loc.websiteUri ? `(${loc.websiteUri})` : ""}`,
      );
      resourceNames.push(resourceName);
    }
  }
  return resourceNames;
}

async function main() {
  const userId = process.argv[2] || DEFAULT_USER;
  const explicitLocation = process.argv[3];

  console.log(`\n=== GBP reviews test ===\nuser: ${userId}`);
  const tokens = await getValidTokens(userId);
  console.log("✓ tokens valid (refreshed if needed)");
  const authClient = buildAuthClient(tokens);

  const locations = explicitLocation ? [explicitLocation] : await discoverLocations(authClient);

  if (locations.length === 0) {
    console.log(
      "\n⚠️  No managed locations. This Google account does not manage any Business Profile,\n" +
        "    so it cannot read reviews for terencelondon.com.au unless granted access.",
    );
    return;
  }

  const { start, end } = lastNDays(30);
  console.log(`\n=== Reviews (period ${start} → ${end}) ===`);
  for (const loc of locations) {
    console.log(`\n📍 ${loc}`);
    const rep = await fetchReputationData(loc, tokens, start, end);
    console.log(JSON.stringify(rep, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
