import { describe, expect, it } from "vitest";
import { isUniqueConstraintViolation } from "@/lib/db";

describe("isUniqueConstraintViolation", () => {
  it("matches a raw pg error with code 23505", () => {
    expect(isUniqueConstraintViolation({ code: "23505" })).toBe(true);
  });

  it("matches a DrizzleQueryError-style wrapper with the pg error on .cause", () => {
    const pgError = Object.assign(new Error("duplicate key value"), { code: "23505" });
    const wrapper = new Error("Failed query: insert into ...");
    (wrapper as Error & { cause?: unknown }).cause = pgError;
    expect(isUniqueConstraintViolation(wrapper)).toBe(true);
  });

  it("does not match unrelated pg error codes", () => {
    expect(isUniqueConstraintViolation({ code: "23503" })).toBe(false);
  });

  it("does not match unrelated codes wrapped on .cause", () => {
    const pgError = Object.assign(new Error("not null violation"), { code: "23502" });
    const wrapper = new Error("Failed query");
    (wrapper as Error & { cause?: unknown }).cause = pgError;
    expect(isUniqueConstraintViolation(wrapper)).toBe(false);
  });

  it("returns false for non-error, non-object input", () => {
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
    expect(isUniqueConstraintViolation("some string")).toBe(false);
  });
});
