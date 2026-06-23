import { describe, expect, it } from "vitest";

describe("Formatters", () => {
  const mockReport = {
    subjectLine: "May Analytics Report",
    summary: "Overall growth this month was positive.",
    actions: ["Optimize underperforming pages", "Increase content targeting", "Test new CTA copy"],
  };

  it("EmailFormatter renders HTML", async () => {
    const { EmailFormatter } = await import("@/lib/formatters/email.formatter");
    const formatter = new EmailFormatter();
    const html = await formatter.format(mockReport);

    expect(html).toContain("May Analytics Report");
    expect(html).toContain("Overall growth this month was positive.");
    expect(html).toContain("<h1");
    expect(html).toContain("</h1>");
  });

  it("WhatsAppFormatter renders markdown", async () => {
    const { WhatsAppFormatter } = await import("@/lib/formatters/whatsapp.formatter");
    const formatter = new WhatsAppFormatter();
    const text = await formatter.format(mockReport);

    expect(text).toContain("📊 May Analytics Report");
    expect(text).toContain("Overall growth this month was positive.");
    expect(text).toContain("1. Optimize underperforming pages");
  });

  it("JsonFormatter returns valid JSON", async () => {
    const { JsonFormatter } = await import("@/lib/formatters/json.formatter");
    const formatter = new JsonFormatter();
    const json = await formatter.format(mockReport);

    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.subjectLine).toBe("May Analytics Report");
  });

  it("SlackFormatter creates Block Kit JSON", async () => {
    const { SlackFormatter } = await import("@/lib/formatters/slack.formatter");
    const formatter = new SlackFormatter();
    const blocks = await formatter.format(mockReport);

    expect(() => JSON.parse(blocks)).not.toThrow();
    const parsed = JSON.parse(blocks);
    expect(parsed.blocks).toBeDefined();
    expect(Array.isArray(parsed.blocks)).toBe(true);
  });
});
