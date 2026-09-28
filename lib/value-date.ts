/**
 * Value-date helpers for bank payment files.
 *
 * A pain.001 asks the bank for a value date (ReqdExctnDt). The backend
 * computes the earliest date the bank will honour (local cutoff, weekends,
 * public holidays, processing days) — see GET /banking/accounts/{id}/value-date/.
 * These helpers turn that window into picker constraints and copy.
 */

export interface BankValueDateWindow {
  earliest_value_date: string; // YYYY-MM-DD
  local_now: string; // ISO datetime in the bank's timezone
  local_date: string; // YYYY-MM-DD
  cutoff_time: string | null; // HH:MM, bank-local
  cutoff_passed: boolean;
  timezone: string;
  processing_days: number;
  country_code: string;
  same_day_available: boolean;
  holidays_skipped: string[];
  bank_name?: string | null;
  bank_account_id?: number;
  requested_date?: string;
  requested_date_valid?: boolean;
  requested_date_reason?: string | null;
}

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

/** True when a calendar day should be disabled in the value-date picker. */
export function isValueDateDisabled(date: Date, window?: BankValueDateWindow | null): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  if (!window) return false;
  if (toIsoDate(date) < window.earliest_value_date) return true;
  return window.holidays_skipped.includes(toIsoDate(date));
}

/** One-line explanation of why the default value date is what it is. */
export function valueDateHint(window?: BankValueDateWindow | null): string {
  if (!window) return '';
  const tz = window.timezone.replace('_', ' ');
  const cutoff = window.cutoff_time ? `${window.cutoff_time} ${tz}` : null;
  if (window.same_day_available) {
    return cutoff
      ? `Same-day value is available until ${cutoff}. Files uploaded after the cutoff must carry the next business day.`
      : 'Same-day value is available.';
  }
  const parts: string[] = [];
  if (window.cutoff_passed && cutoff) {
    parts.push(`The ${cutoff} cutoff for same-day value has passed`);
  } else if (window.processing_days > 0) {
    parts.push(
      `${window.bank_name || 'The bank'} needs ${window.processing_days} processing day${
        window.processing_days === 1 ? '' : 's'
      }`,
    );
  } else {
    parts.push('Today is not a business day');
  }
  if (window.holidays_skipped.length) {
    parts.push(`public holiday${window.holidays_skipped.length === 1 ? '' : 's'} skipped`);
  }
  return `${parts.join('; ')}. Earliest value date is ${window.earliest_value_date}.`;
}
