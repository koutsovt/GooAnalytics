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
