/**
 * DESTRUCTIVE: delete report history rows. Guarded by an explicit confirmation
 * flag so it can never run by accident.
 *
 * Deletes reports only (report_history) — configs, users, billing are untouched,
 * so the app keeps working and you just start with a clean report slate.
 *
 * Usage (run inside Railway so the internal DB host resolves):
 *   PURGE_CONFIRM=yes railway run --service GooAnalytics npx tsx scripts/purge-reports.ts
 *
 * Optional: scope to one owner with PURGE_USER_ID=<userId>.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import pkg from "pg";

const { Pool } = pkg;
config({ path: resolve(".env.local") });

async function main() {
  if (process.env.PURGE_CONFIRM !== "yes") {
    console.error("Refusing to purge: set PURGE_CONFIRM=yes to confirm this destructive action.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const userId = process.env.PURGE_USER_ID?.trim();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const before = await pool.query("SELECT COUNT(*)::int AS n FROM report_history");
  console.log(`report_history rows before: ${before.rows[0].n}`);

  const result = userId
    ? await pool.query("DELETE FROM report_history WHERE user_id = $1", [userId])
    : await pool.query("DELETE FROM report_history");

  console.log(
    `Deleted ${result.rowCount} report(s)${userId ? ` for user ${userId}` : " (all users)"}.`,
  );

  const after = await pool.query("SELECT COUNT(*)::int AS n FROM report_history");
  console.log(`report_history rows after: ${after.rows[0].n}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Purge failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
