import { describe, expect, it } from 'vitest';
import { parseIsoDate, toIsoDate } from '@/lib/value-date';

describe('value-date helpers', () => {
  it('round-trips ISO dates without timezone drift', () => {
    expect(toIsoDate(parseIsoDate('2026-09-22'))).toBe('2026-09-22');
    expect(parseIsoDate('2026-09-22').getDate()).toBe(22);
  });
});
