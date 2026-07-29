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
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}
