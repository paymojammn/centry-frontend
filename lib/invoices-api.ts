/**
 * Invoices API Client
 *
 * Handles sales invoices (ACCREC / receivables) from ERP sync.
 */

import api from './api';

const INVOICES_BASE_URL = '/api/v1/xero/invoices';

export interface Invoice {
  id: number;
  org: string;
  organization_name: string;
  customer_name: string;
  currency: string;
  description: string;
  source_connection: string;
  status: string;
  invoice_status: string;
  invoice_id: string;
  invoice_number: string;
  reference: string;
  invoice_type: string;
  date: string;
  due_date: string | null;
  currency_code: string;
  subtotal: string;
  total_tax: string;
  total: string;
  amount_due: string;
  amount_paid: string;
  sent_to_contact: boolean;
  created_at: string;
}

export interface InvoiceStats {
  total_outstanding: string;
  outstanding_count: number;
  overdue_amount: string;
  overdue_count: number;
  total_paid: string;
  total_invoices: number;
}

export interface InvoiceFilters {
  status?: string;
  organization?: string;
}

export const invoicesApi = {
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.organization) {
      params.append('organization', filters.organization);
    }
    const query = params.toString();
    const { data } = await api.get(`${INVOICES_BASE_URL}/${query ? `?${query}` : ''}`);
    return data?.results || data || [];
  },

  async getInvoice(id: number): Promise<Invoice> {
    const { data } = await api.get(`${INVOICES_BASE_URL}/${id}/`);
    return data;
  },

  async getInvoiceStats(organizationId?: string): Promise<InvoiceStats> {
    const params = organizationId ? `?organization=${organizationId}` : '';
    const { data } = await api.get(`${INVOICES_BASE_URL}/stats/${params}`);
    return data;
  },
};

export default invoicesApi;
