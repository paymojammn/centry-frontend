import { describe, expect, it } from 'vitest';
import {
  isValueDateDisabled,
  parseIsoDate,
  toIsoDate,
  valueDateHint,
  type BankValueDateWindow,
} from '@/lib/value-date';

// Stanbic Uganda on Mon 21 Sep 2026 at 17:00 EAT — the incident file's context.
const afterCutoff: BankValueDateWindow = {
  earliest_value_date: '2026-09-22',
  local_now: '2026-09-21T17:00:44+03:00',
  local_date: '2026-09-21',
  cutoff_time: '15:00',
  cutoff_passed: true,
  timezone: 'Africa/Kampala',
  processing_days: 0,
  country_code: 'UG',
  same_day_available: false,
  holidays_skipped: [],
  bank_name: 'Stanbic',
};

describe('value-date helpers', () => {
  it('round-trips ISO dates without timezone drift', () => {
    expect(toIsoDate(parseIsoDate('2026-09-22'))).toBe('2026-09-22');
    expect(parseIsoDate('2026-09-22').getDate()).toBe(22);
  });

  it('disables weekends, days before the earliest date, and skipped holidays', () => {
    expect(isValueDateDisabled(parseIsoDate('2026-09-21'), afterCutoff)).toBe(true); // before earliest
    expect(isValueDateDisabled(parseIsoDate('2026-09-22'), afterCutoff)).toBe(false);
    expect(isValueDateDisabled(parseIsoDate('2026-09-26'), afterCutoff)).toBe(true); // Saturday
    expect(
      isValueDateDisabled(parseIsoDate('2026-10-09'), { ...afterCutoff, holidays_skipped: ['2026-10-09'] }),
    ).toBe(true);
  });

  it('only disables weekends when no window is loaded yet', () => {
    expect(isValueDateDisabled(parseIsoDate('2026-09-21'), null)).toBe(false);
    expect(isValueDateDisabled(parseIsoDate('2026-09-27'), null)).toBe(true);
  });

  it('explains a missed cutoff', () => {
    expect(valueDateHint(afterCutoff)).toBe(
      'The 15:00 Africa/Kampala cutoff for same-day value has passed. Earliest value date is 2026-09-22.',
    );
  });

  it('explains same-day availability with the cutoff', () => {
    const hint = valueDateHint({
      ...afterCutoff,
      earliest_value_date: '2026-09-21',
      cutoff_passed: false,
      same_day_available: true,
    });
    expect(hint).toContain('until 15:00 Africa/Kampala');
  });

  it('explains processing days and holidays', () => {
    const hint = valueDateHint({
      ...afterCutoff,
      cutoff_passed: false,
      processing_days: 2,
      earliest_value_date: '2026-10-12',
      holidays_skipped: ['2026-10-09'],
    });
    expect(hint).toBe(
      'Stanbic needs 2 processing days; public holiday skipped. Earliest value date is 2026-10-12.',
    );
  });
});
