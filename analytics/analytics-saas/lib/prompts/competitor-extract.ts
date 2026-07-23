/**
 * Prompt that turns the visible text of a salon/service website into a small,
 * explicit price list. Hard rules keep it honest: only real, stated prices,
 * never invented numbers, empty when the page has none (very common — many
 * sites hide prices behind JS booking widgets).
 *
 * The model must return ONLY a JSON object:
 *   { "currency": "GBP", "services": [{ "name": "...", "price": 35, "raw": "from £35" }] }
 */
export function buildCompetitorExtractPrompt(pageText: string, businessName: string): string {
  // Cap the text we send — price lists live near the top of a services page and
  // huge inputs waste tokens and risk truncation.
  const clipped = pageText.slice(0, 12_000);

  return `You extract a service price list from the text of a business's own website. The business is "${businessName}".

TASK: Read the page text below and return the services that have an EXPLICIT price stated on the page.

HARD RULES — follow strictly:
- ONLY extract a service when the page states an actual price for it. If no prices appear, return an empty services array.
- NEVER invent, estimate, average, or infer a price. No price on the page → the service is not included.
- "price" is the numeric amount (e.g. 35 for "£35", 28.5 for "£28.50"). If a range or "from" price is given, use the lowest number.
- "raw" is the exact price string as it appears on the page (e.g. "from £35", "£28–£45"). Preserve it verbatim.
- "name" is the short service name as written (e.g. "Men's Cut", "Cut & Blow Dry"). Keep it concise.
- Infer "currency" as an ISO code (GBP, EUR, USD, AUD…) from the currency symbol; default "GBP" if a £ is present, otherwise the most likely code. If there are no prices, still return your best-guess currency.
- Return at most 15 services. Skip package deals and memberships if individual services exist.

Return ONLY valid JSON with no markdown fences, in exactly this shape:
{"currency":"GBP","services":[{"name":"Men's Cut","price":35,"raw":"from £35"}]}

PAGE TEXT:
"""
${clipped}
"""`;
}
