import { describe, expect, it } from "vitest";
import { displayNameMatchesSite, sameHost, siteNameFromUrl } from "@/lib/url";

describe("sameHost", () => {
  it("matches identical hosts", () => {
    expect(sameHost("https://acme.com/path", "https://acme.com/other")).toBe(true);
  });

  it("ignores a leading www.", () => {
    expect(sameHost("https://www.acme.com", "https://acme.com")).toBe(true);
  });

  it("rejects different hosts", () => {
    expect(sameHost("https://acme.com", "https://other.com")).toBe(false);
  });

  it("returns false for invalid input", () => {
    expect(sameHost("", "https://acme.com")).toBe(false);
    expect(sameHost("not a url", "https://acme.com")).toBe(false);
  });
});

describe("siteNameFromUrl", () => {
  it("extracts the brand token from the hostname", () => {
    expect(siteNameFromUrl("https://www.acme.com.au")).toBe("acme");
  });

  it("returns null for a token shorter than 3 characters", () => {
    expect(siteNameFromUrl("https://ab.com")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(siteNameFromUrl("not a url")).toBeNull();
  });
});

describe("displayNameMatchesSite", () => {
  it("matches a plain brand name", () => {
    expect(displayNameMatchesSite("Acme", "https://acme.com.au")).toBe(true);
  });

  it("matches despite punctuation/case/hyphen differences", () => {
    expect(displayNameMatchesSite("Acme Plumbing Pty Ltd", "https://acme-plumbing.com.au")).toBe(
      true,
    );
  });

  it("does not match an unrelated name", () => {
    expect(displayNameMatchesSite("Other Business", "https://acme.com.au")).toBe(false);
  });

  it("returns false when the website URL is invalid or missing", () => {
    expect(displayNameMatchesSite("Acme", "")).toBe(false);
    expect(displayNameMatchesSite("Acme", "not a url")).toBe(false);
  });
});
