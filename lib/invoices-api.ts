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
    const url = query ? `${INVOICES_BASE_URL}/?${query}` : `${INVOICES_BASE_URL}/`;
    const res = await api.get<{ results: Invoice[] } | Invoice[]>(url);
    return Array.isArray(res) ? res : (res as any).results ?? [];
  },

  async getInvoice(id: number): Promise<Invoice> {
    return api.get<Invoice>(`${INVOICES_BASE_URL}/${id}/`);
  },

  async getInvoiceStats(organizationId?: string): Promise<InvoiceStats> {
    const params = organizationId ? `?organization=${organizationId}` : '';
    const res = await api.get<InvoiceStats>(`${INVOICES_BASE_URL}/stats/${params}`);
    return res ?? {
      total_outstanding: '0',
      outstanding_count: 0,
      overdue_amount: '0',
      overdue_count: 0,
      total_paid: '0',
      total_invoices: 0,
    };
  },

  async collectInvoices(payload: {
    organization_id: string;
    invoice_ids: number[];
    amounts: Record<string, string>;
    method: string;
    phone_number?: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    note?: string;
  }): Promise<{
    success: boolean;
    results: { invoice_id: number; success: boolean; payment_event_id: number | null; reference: string; error_message: string }[];
    summary: { total: number; successful: number; failed: number };
  }> {
    return api.post(`${INVOICES_BASE_URL}/collect/`, payload);
  },

  async getCustomerDetails(invoiceId: number): Promise<{
    customer: { id: number; name: string; email: string; phones: { type: string; number: string }[] };
    invoice_amount: string;
    invoice_currency: string;
    recommended_phone: string;
  }> {
    return api.get(`${INVOICES_BASE_URL}/${invoiceId}/customer-details/`);
  },
  async getCollectionEvents(filters?: { organization?: string; status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('direction', 'IN');
    if (filters?.organization) params.append('organization', filters.organization);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    const res = await api.get<{ results: any[] } | any[]>(`/api/v1/xero/payments/?${query}`);
    return Array.isArray(res) ? res : (res as any).results ?? [];
  },
};

export default invoicesApi;
