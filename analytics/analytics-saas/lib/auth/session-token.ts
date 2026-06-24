/**
 * Signed-cookie helpers shared by the Node runtime (lib/auth/session.ts) and
 * the Edge runtime (middleware.ts). Both must agree byte-for-byte, so the logic
 * lives here once instead of being reimplemented per runtime.
 *
 * Uses Web Crypto (`crypto.subtle`), which is a global in both Edge and Node
 * 20+, and an HMAC-SHA256 hex digest — identical output to Node's
 * `createHmac("sha256").digest("hex")`, so cookies signed by either runtime
 * verify in the other and previously issued cookies remain valid.
 */
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time hex comparison to avoid leaking signature bytes via timing. */
function timingSafeEqualHex(a: string, b: string): boolean {
  // HMAC-SHA256 hex is always 64 chars, so length is fixed and not secret;
  // bailing on a length mismatch does not leak anything useful.
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(signature);
}

/** Sign `value` into the `<value>.<hmac>` cookie payload. */
export async function signToken(value: string, secret: string): Promise<string> {
  const signature = await hmacHex(value, secret);
  return `${value}.${signature}`;
}

/** Verify a `<value>.<hmac>` payload; returns the value on success, else null. */
export async function verifyToken(signed: string, secret: string): Promise<string | null> {
  const separator = signed.lastIndexOf(".");
  if (separator <= 0) return null;

  const value = signed.slice(0, separator);
  const signature = signed.slice(separator + 1);
  if (!value || !signature) return null;

  const expected = await hmacHex(value, secret);
  return timingSafeEqualHex(signature, expected) ? value : null;
}
