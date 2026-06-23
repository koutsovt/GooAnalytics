import crypto from "crypto";
import { describe, expect, it } from "vitest";

function signCookie(value: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function verifyCookie(signedValue: string, secret: string): string | null {
  const [value, signature] = signedValue.split(".");
  if (!value || !signature) return null;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(value);
  const expected = hmac.digest("hex");

  try {
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

describe("Session", () => {
  const secret = "a".repeat(32);

  it("signs and verifies a cookie", () => {
    const userId = "usr_test_123";
    const signed = signCookie(userId, secret);
    const verified = verifyCookie(signed, secret);
    expect(verified).toBe(userId);
  });

  it("rejects tampered cookie", () => {
    const userId = "usr_test_123";
    const signed = signCookie(userId, secret);
    const tampered = signed.replace("123", "456");
    const verified = verifyCookie(tampered, secret);
    expect(verified).toBeNull();
  });

  it("rejects invalid secret", () => {
    const userId = "usr_test_123";
    const signed = signCookie(userId, secret);
    const wrongSecret = "b".repeat(32);
    const verified = verifyCookie(signed, wrongSecret);
    expect(verified).toBeNull();
  });

  it("rejects malformed cookie", () => {
    const verified = verifyCookie("no-signature-here", secret);
    expect(verified).toBeNull();
  });
});
