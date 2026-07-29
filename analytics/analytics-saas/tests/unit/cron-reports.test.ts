import { describe, expect, it, vi } from "vitest";
import type { reportConfigs } from "@/lib/db/schema";

vi.mock("@/lib/db", () => ({
  db: { query: { reportConfigs: { findMany: vi.fn() } } },
}));
vi.mock("@/lib/queue", () => ({
  reportQueue: { add: vi.fn() },
}));
vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret-test-secret-test-secret" },
}));

const { computeReportWindow, shouldRunNow } = await import("@/app/api/cron/reports/route");

type Config = typeof reportConfigs.$inferSelect;

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    id: "cfg_1",
    userId: "user_1",
    ga4PropertyId: null,
    gscSiteUrl: null,
    gbpLocationId: null,
    placeId: null,
    competitorPlaceIds: null,
    businessName: "Test Business",
    businessType: null,
    activeChannels: ["email"],
    subscriptionActive: true,
    recipientEmail: null,
    recipientPhone: null,
    scheduleFrequency: "monthly",
    scheduleDayOfMonth: 1,
    scheduleDayOfWeek: 1,
    scheduleTime: "09:00",
    scheduleTimezone: "UTC",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Config;
}

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

describe("shouldRunNow", () => {
  // 2024-07-15 09:00 UTC is a Monday (weekday 1), day-of-month 15.
  const monday9am = new Date("2024-07-15T09:00:00.000Z");

  it("fires a daily config every day at the matching hour, regardless of weekday/day-of-month", () => {
    const config = makeConfig({
      scheduleFrequency: "daily",
      scheduleTime: "09:00",
      scheduleTimezone: "UTC",
      scheduleDayOfWeek: 3,
      scheduleDayOfMonth: 20,
    });
    expect(shouldRunNow(config, monday9am)).toBe(true);

    const tuesday9am = new Date("2024-07-16T09:00:00.000Z");
    expect(shouldRunNow(config, tuesday9am)).toBe(true);
  });

  it("does not fire a daily config outside the matching hour", () => {
    const config = makeConfig({ scheduleFrequency: "daily", scheduleTime: "09:00" });
    const wrongHour = new Date("2024-07-15T10:00:00.000Z");
    expect(shouldRunNow(config, wrongHour)).toBe(false);
  });

  it("fires a weekly config only on its configured weekday at the matching hour", () => {
    const config = makeConfig({
      scheduleFrequency: "weekly",
      scheduleTime: "09:00",
      scheduleTimezone: "UTC",
      scheduleDayOfWeek: 1, // Monday
    });
    expect(shouldRunNow(config, monday9am)).toBe(true);

    const tuesday9am = new Date("2024-07-16T09:00:00.000Z");
    expect(shouldRunNow(config, tuesday9am)).toBe(false);
  });

  it("fires a monthly config only on its configured day-of-month at the matching hour", () => {
    const config = makeConfig({
      scheduleFrequency: "monthly",
      scheduleTime: "09:00",
      scheduleTimezone: "UTC",
      scheduleDayOfMonth: 15,
    });
    expect(shouldRunNow(config, monday9am)).toBe(true);

    const wrongDay = new Date("2024-07-16T09:00:00.000Z");
    expect(shouldRunNow(config, wrongDay)).toBe(false);
  });
});
