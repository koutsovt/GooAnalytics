import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Postgres unique-violation error code. Used to detect duplicate
// (configId, period) report_history inserts caused by overlapping/duplicate
// cron or MCP job triggers, so callers can log-and-skip instead of failing
// the whole job.
//
// drizzle-orm wraps every query failure in a DrizzleQueryError, moving the
// real `pg` error (with `.code`) onto `.cause` instead of the top-level
// error. Check both so this still matches whether callers pass the raw pg
// error or the Drizzle wrapper.
function hasCode23505(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    (value as { code: unknown }).code === "23505"
  );
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (hasCode23505(error)) return true;
  const cause = error instanceof Error ? error.cause : undefined;
  return hasCode23505(cause);
}
