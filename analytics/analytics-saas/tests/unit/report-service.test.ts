import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const findFirstConfigMock = vi.fn();
const findFirstHistoryMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      reportConfigs: { findFirst: findFirstConfigMock },
      reportHistory: { findFirst: findFirstHistoryMock },
    },
    insert: insertMock,
  },
  isUniqueConstraintViolation: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505",
}));

vi.mock("@/lib/auth/google-oauth", () => ({
  getValidTokens: vi.fn().mockResolvedValue({
    accessToken: "token",
    refreshToken: "refresh",
    expiryDate: Date.now() + 3600_000,
  }),
}));

vi.mock("@/lib/clients/anthropic", () => ({
  generateBrief: vi
    .fn()
    .mockResolvedValue({ subjectLine: "Subject", summary: "Summary", actions: [] }),
}));

vi.mock("@/lib/services/analytics.service", () => ({
  fetchAnalyticsData: vi.fn().mockResolvedValue({
    website: { sessions: 0 },
    search: { impressions: 0, clicks: 0 },
    local: {},
    reputation: {},
    connections: {},
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { generateReport } = await import("@/lib/services/report.service");

describe("generateReport idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstConfigMock.mockResolvedValue({
      id: "cfg_1",
      userId: "user_1",
      gscSiteUrl: "https://example.com",
      businessName: "Test Business",
      ga4PropertyId: null,
      gbpLocationId: null,
      placeId: null,
      businessType: null,
      scheduleTimezone: "UTC",
    });
    findFirstHistoryMock.mockResolvedValue(undefined);
  });

  it("inserts a new report_history row when no duplicate exists", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values });

    const brief = await generateReport("user_1", "cfg_1", "2024-07-01", "2024-07-15");

    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ configId: "cfg_1", period: "2024-07-01_to_2024-07-15" }),
    );
    expect(brief.subjectLine).toBe("Subject");
  });

  it("swallows a unique-constraint violation on duplicate (configId, period) insert", async () => {
    const values = vi.fn().mockRejectedValue({ code: "23505" });
    insertMock.mockReturnValue({ values });

    await expect(generateReport("user_1", "cfg_1", "2024-07-01", "2024-07-15")).resolves.toEqual(
      expect.objectContaining({ subjectLine: "Subject" }),
    );
  });

  it("rethrows non-unique-constraint insert errors", async () => {
    const values = vi.fn().mockRejectedValue(new Error("connection lost"));
    insertMock.mockReturnValue({ values });

    await expect(generateReport("user_1", "cfg_1", "2024-07-01", "2024-07-15")).rejects.toThrow(
      "connection lost",
    );
  });
});
