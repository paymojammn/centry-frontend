/**
 * Value-date helpers for bank payment files.
 *
 * A pain.001 asks the bank for a value date (ReqdExctnDt). The backend picks
 * the earliest date the bank will honour and the Pay tab refreshes a lapsed
 * one on upload; the UI only ever needs to display the date.
 */

/** Parse YYYY-MM-DD as a local calendar date (no timezone shift). */
export function parseIsoDate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD using local calendar fields. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
