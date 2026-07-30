/**
 * Compare two URLs by host, ignoring a leading "www." and trailing slashes.
 * Returns false for empty/invalid input so an absent website never counts as a
 * match. Pure helper with no dependencies, safe to import anywhere.
 */
export function sameHost(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "");
    const hb = new URL(b).hostname.replace(/^www\./, "");
    return ha.length > 0 && ha === hb;
  } catch {
    return false;
  }
}

/**
 * The brand-ish token from a URL's hostname — e.g. "acme" from
 * "www.acme.com.au". Good enough for fuzzy-matching against a GA4/GBP display
 * name without pulling in a full public-suffix list. Returns null for
 * empty/invalid input or a token too short to match confidently.
 */
export function siteNameFromUrl(websiteUrl: string): string | null {
  try {
    const hostname = new URL(websiteUrl).hostname.replace(/^www\./, "");
    const token = hostname.split(".")[0] ?? "";
    return token.length >= 3 ? token : null;
  } catch {
    return null;
  }
}

/**
 * Loosely checks whether a GA4/GBP display name looks like it belongs to
 * `websiteUrl` — e.g. "Acme Plumbing" matches "acme-plumbing.com.au". Used to
 * suggest (not force) a likely pick when a config already has a website URL,
 * so punctuation/case/hyphen differences don't break the match.
 */
export function displayNameMatchesSite(displayName: string, websiteUrl: string): boolean {
  const token = siteNameFromUrl(websiteUrl);
  if (!token) return false;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedName = normalize(displayName);
  const normalizedToken = normalize(token);
  return normalizedToken.length >= 3 && normalizedName.includes(normalizedToken);
}
