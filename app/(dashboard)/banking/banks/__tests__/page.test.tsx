import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BankRegistryPage from '../page';
import { NO_RIGHTS, type RegistryRights } from '@/lib/bank-registry-api';

const ALL_RIGHTS: RegistryRights = {
  add_bank: true,
  change_bank: true,
  add_branch: true,
  change_branch: true,
};

// jsdom has no ResizeObserver; the Radix Switch in the edit form needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

let rights: RegistryRights = NO_RIGHTS;

const bank = {
  id: 1,
  country: 'UG',
  country_name: 'Uganda',
  name: 'Stanbic Bank Uganda Limited',
  short_name: 'Stanbic Bank',
  code: 'STANBIC_UG',
  swift_code: 'SBICUGKX',
  bank_type: 'commercial' as const,
  is_active: true,
  branch_count: 2,
};

const branch = {
  id: 10,
  bank: 1,
  bank_name: 'Stanbic Bank',
  branch_code: '040147',
  branch_name: 'HEAD OFFICE',
  address: '',
  is_head_office: true,
  is_active: true,
};

const page = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

vi.mock('@/hooks/use-organization', () => ({
  useOrganizations: () => ({ data: [{ id: 'org-1', country_code: 'UG' }] }),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
}));

vi.mock('@/hooks/use-bank-registry', () => ({
  useRegistryCountries: () => ({
    data: { countries: [{ id: 1, code: 'UG', name: 'Uganda', bank_count: 1 }], rights },
    isLoading: false,
  }),
  useRegistryBanks: () => ({ data: { ...page([bank]), rights }, isLoading: false, isFetching: false }),
  useRegistryBranches: (bankId?: number) => ({
    data: bankId ? page([branch]) : undefined,
    isLoading: false,
  }),
  useSaveBank: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveBranch: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('Banks & Branches page', () => {
  beforeEach(() => {
    rights = NO_RIGHTS;
  });

  it('lists banks read-only when the user has no registry rights', () => {
    render(<BankRegistryPage />);
    expect(screen.getByText('Stanbic Bank')).toBeInTheDocument();
    expect(screen.getByText('SBICUGKX')).toBeInTheDocument();
    expect(screen.getByText(/read-only for you/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add bank/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit stanbic/i })).not.toBeInTheDocument();
  });

  it('shows branches read-only when a bank is opened without rights', () => {
    render(<BankRegistryPage />);
    fireEvent.click(screen.getByText('Stanbic Bank'));
    expect(screen.getByText('040147')).toBeInTheDocument();
    expect(screen.getByText('Head office')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add branch/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit head office/i })).not.toBeInTheDocument();
  });

  it('offers add and edit controls to users with registry rights', () => {
    rights = ALL_RIGHTS;
    render(<BankRegistryPage />);
    expect(screen.queryByText(/read-only for you/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add bank/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit stanbic/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Stanbic Bank'));
    expect(screen.getByRole('button', { name: /add branch/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit head office/i })).toBeInTheDocument();
  });

  it('opens the edit form pre-filled, with the country locked', () => {
    rights = ALL_RIGHTS;
    render(<BankRegistryPage />);
    fireEvent.click(screen.getByRole('button', { name: /edit stanbic/i }));
    expect(screen.getByRole('heading', { name: 'Edit Bank' })).toBeInTheDocument();
    expect(screen.getByLabelText(/bank name/i)).toHaveValue('Stanbic Bank Uganda Limited');
    expect(screen.getByLabelText(/swift/i)).toHaveValue('SBICUGKX');
    // Editing must not open the branches panel behind it.
    expect(screen.queryByText('040147')).not.toBeInTheDocument();
  });
});
