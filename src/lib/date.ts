/**
 * Format an ISO date string as a long US date (e.g. "March 5, 2025").
 *
 * Falls back to the raw string if it doesn't parse. Used by the News list and
 * post pages. Note: this parses the ISO string as-is (UTC for date-only values);
 * pages that need local-midnight semantics (e.g. exhibitions) format inline.
 */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
