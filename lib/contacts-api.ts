/**
 * Contacts API Client
 * 
 * Handles fetching Xero contacts for vendors/suppliers
 */

import api from './api';

const XERO_BASE_URL = '/api/v1/xero';

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
  active: number;
}

export interface ContactsFilters {
  type?: 'supplier' | 'customer';
  status?: string;
  search?: string;
  page?: number;
  organization?: string;
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
    const url = `${XERO_BASE_URL}/contacts/${queryString ? `?${queryString}` : ''}`;

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

  /**
   * Get contact statistics
   * @param filters - Optional filters for stats (e.g., organization)
   */
  async getContactStats(filters?: ContactsFilters): Promise<ContactStats> {
    const params = new URLSearchParams();

    if (filters?.organization) params.append('organization', filters.organization);

    const queryString = params.toString();
    const url = `${XERO_BASE_URL}/contacts/stats/${queryString ? `?${queryString}` : ''}`;

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
