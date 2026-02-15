import { describe, it, expect } from 'vitest';
import {
  getStatusColor,
  formatCompactNumber,
  getInitials,
  formatDate,
  STATUS_COLORS,
} from '../theme';

describe('getStatusColor', () => {
  it('returns correct color for draft status', () => {
    expect(getStatusColor('draft')).toBe(STATUS_COLORS.draft);
  });

  it('returns correct color for paid status', () => {
    expect(getStatusColor('paid')).toBe(STATUS_COLORS.paid);
  });

  it('returns correct color for failed status', () => {
    expect(getStatusColor('failed')).toBe(STATUS_COLORS.failed);
  });

  it('returns awaiting_approval for submitted status', () => {
    expect(getStatusColor('submitted')).toBe(STATUS_COLORS.awaiting_approval);
  });

  it('returns repeating (default) for unknown status', () => {
    expect(getStatusColor('unknown_status')).toBe(STATUS_COLORS.repeating);
  });

  it('handles case-insensitive status strings', () => {
    expect(getStatusColor('PAID')).toBe(STATUS_COLORS.paid);
    expect(getStatusColor('Draft')).toBe(STATUS_COLORS.draft);
  });

  it('handles status with spaces', () => {
    expect(getStatusColor('awaiting approval')).toBe(STATUS_COLORS.awaiting_approval);
  });
});

describe('formatCompactNumber', () => {
  it('formats numbers below 1000 with locale string', () => {
    expect(formatCompactNumber(500)).toBe('500');
  });

  it('formats thousands with K suffix', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
  });

  it('formats millions with M suffix', () => {
    expect(formatCompactNumber(2500000)).toBe('2.5M');
  });

  it('removes trailing .0 from formatted numbers', () => {
    expect(formatCompactNumber(1000)).toBe('1K');
    expect(formatCompactNumber(1000000)).toBe('1M');
  });
});

describe('getInitials', () => {
  it('returns two initials from a full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns first two characters for a single word', () => {
    expect(getInitials('John')).toBe('JO');
  });

  it('returns ? for null or undefined', () => {
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });
});

describe('formatDate', () => {
  it('returns formatted date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns dash for null or undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});
