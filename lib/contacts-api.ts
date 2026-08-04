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

export interface ContactBankAccount {
  id: number;
  contact: number;
  bank: number;
  bank_name: string;
  bank_country_code: string | null;
  branch: number | null;
  branch_code: string | null;
  branch_name: string | null;
  account_name: string;
  account_number: string;
  currency: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactBankAccountInput {
  contact: number;
  bank: number;
  branch?: number | null;
  account_name: string;
  account_number: string;
  currency?: string;
  is_primary?: boolean;
}

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

  /** Update editable contact fields (phone, email) in Paymoja. */
  async updateContactDetails(
    id: number,
    data: { phone?: string; email_address?: string | null },
  ): Promise<Contact> {
    return await api.patch<Contact>(`${XERO_BASE_URL}/contacts/${id}/details/`, data);
  },

  /** A vendor's bank accounts (account + bank + branch). */
  async getContactBankAccounts(contactId: number): Promise<ContactBankAccount[]> {
    const res = await api.get<ContactBankAccount[] | { results: ContactBankAccount[] }>(
      `${XERO_BASE_URL}/contact-bank-accounts/?contact=${contactId}`,
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
   * Get contact payment details from ERP
   * @param id - Contact ID
   */
  async getContactPaymentDetails(id: string): Promise<{
    contact_id: string;
    name: string;
    bank_account_details?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    linked_bank_id?: number;
    linked_bank_name?: string;
    accounts_payable_tax_type?: string;
    default_currency?: string;
    phone_numbers?: Array<{
      type: string;
      number: string;
    }>;
    email?: string;
  }> {
    const response = await api.get(
      `${XERO_BASE_URL}/contacts/${id}/payment-details/`
    );
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
