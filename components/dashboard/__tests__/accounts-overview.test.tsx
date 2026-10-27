import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AccountsOverview, formatAsOf, formatAmount } from '../accounts-overview';
import type { AccountsOverview as Overview } from '@/hooks/use-banking';

let overview: { data?: Overview; isLoading: boolean } = { isLoading: false };

vi.mock('@/hooks/use-banking', () => ({
  useAccountsOverview: () => overview,
}));

const data: Overview = {
  accounts: [
    {
      id: '1',
      kind: 'bank',
      name: 'Operating UGX',
      institution: 'Stanbic Bank Uganda',
      account_number_masked: '••••4567',
      currency: 'UGX',
      balance: '1300000.00',
      booked_balance: '1250000.00',
      balance_as_of: '2026-10-20',
      balance_age_days: 1,
      is_stale: false,
      is_default: true,
      href: '/banking/accounts',
    },
    {
      id: '2',
      kind: 'bank',
      name: 'USD Reserve',
      institution: 'Stanbic Bank Uganda',
      account_number_masked: '••••9876',
      currency: 'USD',
      balance: '2500.00',
      booked_balance: null,
      balance_as_of: '2026-10-06',
      balance_age_days: 15,
      is_stale: true,
      is_default: false,
      href: '/banking/accounts',
    },
    {
      id: 'momo',
      kind: 'mobile_money',
      name: 'MTN Collections',
      institution: 'MTN Mobile Money',
      account_number_masked: null,
      currency: 'UGX',
      balance: '450000.00',
      booked_balance: null,
      balance_as_of: null,
      balance_age_days: null,
      is_stale: true,
      is_default: false,
      href: '/banking/accounts?tab=providers',
    },
  ],
  totals_by_currency: {
    UGX: { available: '1750000.00', booked: '1700000.00', account_count: 2, stale_count: 1, latest_as_of: '2026-10-20' },
    USD: { available: '2500.00', booked: '2500.00', account_count: 1, stale_count: 1, latest_as_of: '2026-10-06' },
  },
  active_count: 3,
  stale_count: 2,
  stale_after_business_days: 2,
  as_of_today: '2026-10-21',
};

describe('AccountsOverview', () => {
  it('renders one row per active account with masked numbers and amounts', () => {
    overview = { data, isLoading: false };
    render(<AccountsOverview organizationId="org-1" />);
    expect(screen.getByText('Operating UGX')).toBeInTheDocument();
    expect(screen.getByText(/••••4567/)).toBeInTheDocument();
    expect(screen.getByText('1,300,000.00')).toBeInTheDocument();
    expect(screen.getByText('1,250,000.00')).toBeInTheDocument();
    expect(screen.getByText('MTN Mobile Money')).toBeInTheDocument();
    expect(screen.getByText('Mobile money')).toBeInTheDocument();
    expect(screen.getByText(/3 active accounts · 2 stale/)).toBeInTheDocument();
  });

  it('flags stale balances with a muted pill, never fresh ones', () => {
    overview = { data, isLoading: false };
    render(<AccountsOverview organizationId="org-1" />);
    const pills = screen.getAllByText('Stale');
    expect(pills).toHaveLength(2);
    pills.forEach((p) => expect(p).toHaveClass('status-pill'));
    expect(screen.getByText('No statement yet')).toBeInTheDocument();
  });

  it('shows one total tile per currency with ISO codes, never summed across currencies', () => {
    overview = { data, isLoading: false };
    render(<AccountsOverview organizationId="org-1" />);
    expect(screen.getByText('Available · UGX')).toBeInTheDocument();
    expect(screen.getByText('Available · USD')).toBeInTheDocument();
    expect(screen.getByText('UGX 1.8M')).toBeInTheDocument();
    expect(screen.getByText('USD 2.5K')).toBeInTheDocument();
    expect(screen.getByText('2 accounts · as of 20 Oct 2026')).toBeInTheDocument();
  });

  it('links to the accounts page when nothing is active', () => {
    overview = { data: { ...data, accounts: [], totals_by_currency: {}, active_count: 0, stale_count: 0 }, isLoading: false };
    render(<AccountsOverview organizationId="org-1" />);
    expect(screen.getByText('No active accounts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage accounts/i })).toHaveAttribute('href', '/banking/accounts');
    expect(screen.queryByText('Available · UGX')).not.toBeInTheDocument();
  });
});

describe('formatters', () => {
  it('formats as-of dates and falls back when missing', () => {
    expect(formatAsOf('2026-10-20')).toBe('20 Oct 2026');
    expect(formatAsOf(null)).toBe('No statement yet');
    expect(formatAsOf('garbage')).toBe('No statement yet');
  });

  it('formats amounts with two decimals and a dash for null', () => {
    expect(formatAmount('1300000.00')).toBe('1,300,000.00');
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount('x')).toBe('—');
  });
});
