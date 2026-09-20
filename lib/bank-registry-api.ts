/**
 * Bank registry maintenance — the global Bank / BankBranch reference data that
 * feeds the recipient bank + branch pickers (and the branch sort code written
 * into payment files).
 *
 * Everyone can browse it; create/edit needs the backend model permission,
 * reported back as `rights` so the UI only offers what will succeed.
 */

import api from './api';

const BASE = '/api/v1/banking/bank-registry';

export interface RegistryRights {
  add_bank: boolean;
  change_bank: boolean;
  add_branch: boolean;
  change_branch: boolean;
}

export const NO_RIGHTS: RegistryRights = {
  add_bank: false,
  change_bank: false,
  add_branch: false,
  change_branch: false,
};

export interface RegistryCountry {
  id: number;
  code: string;
  name: string;
  bank_count: number;
}

export type BankType = 'commercial' | 'microfinance' | 'development' | 'central' | 'other';

export const BANK_TYPE_LABELS: Record<BankType, string> = {
  commercial: 'Commercial Bank',
  microfinance: 'Microfinance Institution',
  development: 'Development Bank',
  central: 'Central Bank',
  other: 'Other',
};

export interface RegistryBank {
  id: number;
  country: string;
  country_name: string;
  name: string;
  short_name: string;
  code: string;
  swift_code: string;
  bank_type: BankType;
  is_active: boolean;
  branch_count: number;
}

export interface RegistryBankInput {
  country: string;
  name: string;
  short_name?: string;
  code?: string;
  swift_code?: string;
  bank_type?: BankType;
  is_active?: boolean;
}

export interface RegistryBranch {
  id: number;
  bank: number;
  bank_name: string;
  branch_code: string;
  branch_name: string;
  address: string;
  is_head_office: boolean;
  is_active: boolean;
}

export interface RegistryBranchInput {
  bank: number;
  branch_code: string;
  branch_name?: string;
  address?: string;
  is_head_office?: boolean;
  is_active?: boolean;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListParams {
  search?: string;
  page?: number;
  /** Omit to include inactive rows. */
  activeOnly?: boolean;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.append(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const bankRegistryApi = {
  /** Every active country — including ones with no banks yet. */
  getCountries(): Promise<{ countries: RegistryCountry[]; rights: RegistryRights }> {
    return api.get(`${BASE}/banks/countries/`);
  },

  listBanks(
    country: string,
    { search, page, activeOnly }: ListParams = {},
  ): Promise<Paginated<RegistryBank> & { rights: RegistryRights }> {
    return api.get(
      `${BASE}/banks/${query({ country, search, page, is_active: activeOnly ? 'true' : undefined })}`,
    );
  },

  createBank(data: RegistryBankInput): Promise<RegistryBank> {
    return api.post(`${BASE}/banks/`, data);
  },

  updateBank(id: number, data: Partial<RegistryBankInput>): Promise<RegistryBank> {
    return api.patch(`${BASE}/banks/${id}/`, data);
  },

  listBranches(
    bank: number,
    { search, page, activeOnly }: ListParams = {},
  ): Promise<Paginated<RegistryBranch>> {
    return api.get(
      `${BASE}/branches/${query({ bank, search, page, is_active: activeOnly ? 'true' : undefined })}`,
    );
  },

  createBranch(data: RegistryBranchInput): Promise<RegistryBranch> {
    return api.post(`${BASE}/branches/`, data);
  },

  updateBranch(id: number, data: Partial<RegistryBranchInput>): Promise<RegistryBranch> {
    return api.patch(`${BASE}/branches/${id}/`, data);
  },
};
