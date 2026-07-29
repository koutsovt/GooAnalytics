import { describe, expect, it } from "vitest";
import { computePriorPeriod } from "@/lib/clients/ga4";

describe("computePriorPeriod", () => {
  it("returns an equal-length window for a 15-day period", () => {
    // 2024-07-01..2024-07-15 is 15 days, so the prior window must also be
    // 15 days: the 15 days immediately before periodStart.
    expect(computePriorPeriod("2024-07-01", "2024-07-15")).toEqual({
      priorStart: "2024-06-16",
      priorEnd: "2024-06-30",
    });
  });

  it("returns an equal-length window for a 30-day rolling period", () => {
    // 2024-06-02..2024-07-01 is 30 days, so the prior window must be the
    // 30 days ending the day before periodStart.
    expect(computePriorPeriod("2024-06-02", "2024-07-01")).toEqual({
      priorStart: "2024-05-03",
      priorEnd: "2024-06-01",
    });
  });

  it("returns an equal-length window for a full calendar month, not literally the previous month", () => {
    // 2024-07-01..2024-07-31 is 31 days. The prior window must also be 31
    // days (2024-05-31..2024-06-30), not simply "June" (30 days).
    const prior = computePriorPeriod("2024-07-01", "2024-07-31");
    expect(prior).toEqual({
      priorStart: "2024-05-31",
      priorEnd: "2024-06-30",
    });

    const dayMs = 24 * 60 * 60 * 1000;
    const priorLengthDays =
      Math.round(
        (new Date(prior.priorEnd).getTime() - new Date(prior.priorStart).getTime()) / dayMs,
      ) + 1;
    expect(priorLengthDays).toBe(31);
  });

  it("keeps the prior window immediately adjacent to periodStart (no gap/overlap)", () => {
    const { priorEnd } = computePriorPeriod("2024-07-01", "2024-07-15");
    const dayAfterPriorEnd = new Date(priorEnd);
    dayAfterPriorEnd.setUTCDate(dayAfterPriorEnd.getUTCDate() + 1);
    expect(dayAfterPriorEnd.toISOString().slice(0, 10)).toBe("2024-07-01");
  });
});
