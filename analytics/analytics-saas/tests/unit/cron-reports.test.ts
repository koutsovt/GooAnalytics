import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { query: { reportConfigs: { findMany: vi.fn() } } },
}));
vi.mock("@/lib/queue", () => ({
  reportQueue: { add: vi.fn() },
}));
vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret-test-secret-test-secret" },
}));

const { computeReportWindow } = await import("@/app/api/cron/reports/route");

describe("computeReportWindow", () => {
  const now = new Date("2024-07-15T09:00:00.000Z");

  it("gives a weekly config a 7-day window", () => {
    expect(computeReportWindow("weekly", now)).toEqual({
      periodStart: "2024-07-08",
      periodEnd: "2024-07-15",
    });
  });

  it("gives a daily config a 1-day window", () => {
    expect(computeReportWindow("daily", now)).toEqual({
      periodStart: "2024-07-14",
      periodEnd: "2024-07-15",
    });
  });

  it("gives a monthly config the ~30-day window", () => {
    expect(computeReportWindow("monthly", now)).toEqual({
      periodStart: "2024-06-15",
      periodEnd: "2024-07-15",
    });
  });

  it("falls back to the ~30-day window for an unrecognized frequency", () => {
    expect(computeReportWindow("quarterly", now)).toEqual({
      periodStart: "2024-06-15",
      periodEnd: "2024-07-15",
    });
  });
});
