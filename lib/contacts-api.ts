/**
 * Contacts API Client
 * 
 * Handles fetching Xero contacts for vendors/suppliers
 */

import api from './api';

const XERO_BASE_URL = '/api/v1/xero';
// Cross-provider (Xero + QBO + ERPNext) unified contacts list/stats.
const UNIFIED_CONTACTS_URL = '/api/v1/erp/contacts';

export interface ContactPhone {
  phone_type: 'DEFAULT' | 'DDI' | 'FAX' | 'MOBILE';
  phone_number: string;
  area_code: string | null;
  country_code: string | null;
}

export interface Contact {
  id: number;
  contact_id: string;
  name: string;
  email_address: string | null;
  phone: string | null;
  is_supplier: boolean;
  is_customer: boolean;
  contact_status: string;
  phones: ContactPhone[];
  primary_phone: string | null;
  organization_name: string;
  created_at: string;
  updated_utc: string | null;
  /** Which ERP the contact came from (unified list only). */
  provider?: 'xero' | 'qbo' | 'erpnext';
  /** 'complete' when a payable bank / mobile-money account is on file. */
  bank_details_status?: 'complete' | 'missing' | null;
}

export interface ContactsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Contact[];
}

export interface ContactStats {
  total: number;
  suppliers: number;
  customers: number;
  both: number;
  other: number;
  active: number;
}

export interface ContactsFilters {
  type?: 'supplier' | 'customer' | 'other';
  status?: string;
  search?: string;
  page?: number;
  organization?: string;
}

export interface BankOption {
  id: number;
  name: string;
  short_name: string;
  code: string;
  swift_code: string;
  country_code?: string;
  country_name?: string;
}

export interface BankBranchOption {
  id: number;
  branch_code: string;
  branch_name: string;
  is_head_office: boolean;
}

export type BankAccountType = 'bank' | 'mobile_money';
export type MobileProvider = 'mtn' | 'airtel' | 'safaricom' | 'other';

export const MOBILE_PROVIDERS: { value: MobileProvider; label: string }[] = [
  { value: 'mtn', label: 'MTN Mobile Money' },
  { value: 'airtel', label: 'Airtel Money' },
  { value: 'safaricom', label: 'M-Pesa (Safaricom)' },
  { value: 'other', label: 'Other' },
];

/** 8 or 11 character BIC, after upper-casing and stripping spaces. */
export const SWIFT_CODE_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const IBAN_RE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;

export function normalizeSwift(value: string): string {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

export function normalizeIban(value: string): string {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

/**
 * A vendor payout account. Bank accounts point at a registry bank (+ branch)
 * or carry a free-text bank_name + swift_code for banks not in the registry;
 * mobile-money accounts carry provider + number. Owned by either a Xero /
 * QBO-mirrored contact (`contact`) or an ERPNext supplier (`erpnext_contact`).
 */
export interface ContactBankAccount {
  id: number;
  contact: number | null;
  erpnext_contact: string | null;
  account_type: BankAccountType;
  bank: number | null;
  /** Registry short name when `bank` is set, else the free-text name. */
  bank_name: string;
  bank_country_code: string | null;
  branch: number | null;
  branch_code: string | null;
  branch_name: string | null;
  /** Saved SWIFT, falling back to the registry bank's. */
  swift_code: string;
  iban: string;
  country: string;
  mobile_provider: MobileProvider | '';
  mobile_number: string;
  account_name: string;
  account_number: string;
  currency: string;
  is_primary: boolean;
  is_complete: boolean;
  source: 'manual' | 'xero' | 'qbo' | 'erpnext';
  owner_name: string;
  created_at: string;
  updated_at: string;
}

export interface ContactBankAccountInput {
  contact?: number | null;
  erpnext_contact?: string | null;
  account_type?: BankAccountType;
  bank?: number | null;
  branch?: number | null;
  bank_name?: string;
  branch_name?: string;
  swift_code?: string;
  iban?: string;
  country?: string;
  mobile_provider?: MobileProvider | '';
  mobile_number?: string;
  account_name: string;
  account_number?: string;
  currency?: string;
  is_primary?: boolean;
}

/** Which vendor a bank-account list belongs to. */
export type BankAccountOwner = { contact: number } | { erpnext_contact: string };

export const contactsApi = {
  /**
   * Get all contacts for the user's organization
   * @param filters - Optional filters for contacts
   */
  async getContacts(filters?: ContactsFilters): Promise<ContactsResponse> {
    const params = new URLSearchParams();

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.organization) params.append('organization', filters.organization);

    const queryString = params.toString();
    const url = `${UNIFIED_CONTACTS_URL}/${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ContactsResponse>(url);
    return response;
  },

  /**
   * Get a specific contact by ID
   * @param id - Contact ID
   */
  async getContact(id: number): Promise<Contact> {
    const response = await api.get<Contact>(
      `${XERO_BASE_URL}/contacts/${id}/`
    );
    return response;
  },

  /** Update editable contact fields (phone, email) in Centry. */
  async updateContactDetails(
    id: number,
    data: { phone?: string; email_address?: string | null },
  ): Promise<Contact> {
    return await api.patch<Contact>(`${XERO_BASE_URL}/contacts/${id}/details/`, data);
  },

  /** A vendor's payout accounts (bank transfer / mobile money). */
  async getContactBankAccounts(owner: number | BankAccountOwner): Promise<ContactBankAccount[]> {
    const params = new URLSearchParams();
    if (typeof owner === 'number') params.append('contact', String(owner));
    else if ('contact' in owner) params.append('contact', String(owner.contact));
    else params.append('erpnext_contact', owner.erpnext_contact);
    const res = await api.get<ContactBankAccount[] | { results: ContactBankAccount[] }>(
      `${XERO_BASE_URL}/contact-bank-accounts/?${params.toString()}`,
    );
    return Array.isArray(res) ? res : res.results || [];
  },

  async createContactBankAccount(data: ContactBankAccountInput): Promise<ContactBankAccount> {
    return await api.post<ContactBankAccount>(`${XERO_BASE_URL}/contact-bank-accounts/`, data);
  },

  async updateContactBankAccount(
    id: number,
    data: Partial<ContactBankAccountInput>,
  ): Promise<ContactBankAccount> {
    return await api.patch<ContactBankAccount>(
      `${XERO_BASE_URL}/contact-bank-accounts/${id}/`,
      data,
    );
  },

  async deleteContactBankAccount(id: number): Promise<void> {
    await api.del(`${XERO_BASE_URL}/contact-bank-accounts/${id}/`);
  },

  /** Banks + branches from banking_integrations, for the account picker. */
  async getBankCountries(): Promise<{ id: number; code: string; name: string }[]> {
    const res = await api.get<{ countries: { id: number; code: string; name: string }[] }>(
      `/api/v1/banking/bank-countries/`,
    );
    return res.countries || [];
  },

  async getBanks(country?: string, search?: string): Promise<BankOption[]> {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (search) params.append('search', search);
    const qs = params.toString();
    const res = await api.get<{ banks: BankOption[] }>(
      `/api/v1/banking/banks/${qs ? `?${qs}` : ''}`,
    );
    return res.banks || [];
  },

  async getBankBranches(bankId: number): Promise<BankBranchOption[]> {
    const res = await api.get<{ branches: BankBranchOption[] }>(
      `/api/v1/banking/banks/${bankId}/branches/`,
    );
    return res.branches || [];
  },

  /**
   * Get contact statistics
   * @param filters - Optional filters for stats (e.g., organization)
   */
  async getContactStats(filters?: ContactsFilters): Promise<ContactStats> {
    const params = new URLSearchParams();

    if (filters?.organization) params.append('organization', filters.organization);

    const queryString = params.toString();
    const url = `${UNIFIED_CONTACTS_URL}/stats/${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ContactStats>(url);
    return response;
  },

  /**
   * Import contacts from Xero CSV file
   * @param file - CSV file containing Xero contacts
   */
  async importContactsCSV(file: File): Promise<{
    status: 'success' | 'error' | 'queued';
    created: number;
    updated: number;
    skipped: number;
    total: number;
    errors: Array<{
      row: number;
      contact: string;
      error: string;
    }>;
    error?: string;
    task_id?: string;
    message?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Use api client to include CSRF token and proper headers
    const response = await api.post<{
      status: 'success' | 'error';
      created: number;
      updated: number;
      skipped: number;
      total: number;
      errors: Array<{
        row: number;
        contact: string;
        error: string;
      }>;
      error?: string;
    }>(
      `${XERO_BASE_URL}/contacts/import-csv/`,
      formData
    );

    return response;
  },
};
