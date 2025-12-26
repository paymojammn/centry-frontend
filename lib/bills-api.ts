/**
 * Bills API Client
 *
 * Handles all bill-related API requests.
 */

import api from './api';
import type {
  Bill,
  BillStats,
  BillFilters,
  PaymentProviders,
  WalletBalanceCheck,
  BillPaymentPayload,
  BillPaymentResponse,
  BillPaymentExportResponse,
  PaymentEvent,
  PaymentEventStats,
  PaymentEventFilters,
  ApprovePaymentsResponse,
  RejectPaymentsResponse,
  GenerateFileResponse,
  DenyPaymentsResponse,
} from '@/types/bill';

const BILLS_BASE_URL = '/api/v1/xero/bills';
const PAYMENTS_BASE_URL = '/api/v1/xero/payments';
const BANK_EXPORT_BASE_URL = '/api/v1/banking/exports/';

export const billsApi = {
  /**
   * Get all bills with optional filters
   */
  async getBills(filters?: BillFilters): Promise<Bill[]> {
    const params = new URLSearchParams();

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }

    if (filters?.organization) {
      params.append('organization', filters.organization.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `${BILLS_BASE_URL}/?${queryString}` : `${BILLS_BASE_URL}/`;
    return await api.get<Bill[]>(url);
  },

  /**
   * Get a single bill by ID
   */
  async getBill(id: number): Promise<Bill> {
    return await api.get<Bill>(`${BILLS_BASE_URL}/${id}/`);
  },

  /**
   * Get bill statistics
   */
  async getBillStats(organizationId?: string): Promise<BillStats> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization', organizationId);
    const queryString = params.toString();

    const url = queryString
      ? `${BILLS_BASE_URL}/stats/?${queryString}`
      : `${BILLS_BASE_URL}/stats/`;

    return await api.get<BillStats>(url);
  },

  /**
   * Get available payment providers
   */
  async getPaymentProviders(countryCode: string = 'UG'): Promise<PaymentProviders> {
    return await api.get<PaymentProviders>(
      `${BILLS_BASE_URL}/payment_providers/?country=${countryCode}`
    );
  },

  /**
   * Check wallet balance for bill payment
   */
  async checkWalletBalance(
    bills: Array<{ bill_id: string; amount: string }>,
    currency: string = 'UGX'
  ): Promise<WalletBalanceCheck> {
    return await api.post<WalletBalanceCheck>(
      `${BILLS_BASE_URL}/check_wallet_balance/`,
      { bills, currency }
    );
  },

  /**
   * Process bill payment(s)
   */
  async payBills(payload: BillPaymentPayload): Promise<BillPaymentResponse> {
    return await api.post<BillPaymentResponse>(
      `${BILLS_BASE_URL}/pay/`,
      payload
    );
  },

  /**
   * Export bank payment file for bill payments
   * Now generates the file on the server and returns file information
   * Supports automatic currency conversion with user consent
   */
  async exportPaymentFile(
    paymentEventIds: number[],
    fileFormat: 'csv' | 'xml' = 'csv',
    companyName?: string,
    debtorIban?: string,
    debtorBic?: string,
    allowCurrencyConversion?: boolean,
    sourceAccountId?: string | number
  ): Promise<BillPaymentExportResponse> {
    const payload = {
      payment_event_ids: paymentEventIds,
      file_format: fileFormat,
      company_name: companyName,
      debtor_iban: debtorIban,
      debtor_bic: debtorBic,
      allow_currency_conversion: allowCurrencyConversion,
      source_account_id: sourceAccountId,
    };

    console.log('📤 Sending export request:', payload);

    const response = await api.post<BillPaymentExportResponse>(BANK_EXPORT_BASE_URL, payload);

    return response;
  },

  /**
   * Export bill payment (alias for exportPaymentFile)
   */
  async exportBillPayment(
    paymentEventIds: number[],
    fileFormat: 'csv' | 'xml' = 'csv',
    allowCurrencyConversion?: boolean,
    sourceAccountId?: string | number
  ): Promise<BillPaymentExportResponse> {
    return this.exportPaymentFile(
      paymentEventIds,
      fileFormat,
      undefined,
      undefined,
      undefined,
      allowCurrencyConversion,
      sourceAccountId
    );
  },
};

/**
 * Payment Events API Client (Processing Queue)
 */
export const paymentEventsApi = {
  /**
   * Get all payment events with optional filters
   */
  async getPaymentEvents(filters?: PaymentEventFilters): Promise<PaymentEvent[]> {
    const params = new URLSearchParams();

    if (filters?.organization) {
      params.append('organization', filters.organization);
    }
    if (filters?.direction) {
      params.append('direction', filters.direction);
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.method) {
      params.append('method', filters.method);
    }
    if (filters?.synced_to_xero !== undefined) {
      params.append('synced_to_xero', String(filters.synced_to_xero));
    }

    const queryString = params.toString();
    const url = queryString ? `${PAYMENTS_BASE_URL}/?${queryString}` : `${PAYMENTS_BASE_URL}/`;
    return await api.get<PaymentEvent[]>(url);
  },

  /**
   * Get a single payment event by ID
   */
  async getPaymentEvent(id: number): Promise<PaymentEvent> {
    return await api.get<PaymentEvent>(`${PAYMENTS_BASE_URL}/${id}/`);
  },

  /**
   * Get payment event statistics
   */
  async getPaymentEventStats(organizationId?: string): Promise<PaymentEventStats> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization', organizationId);
    const queryString = params.toString();

    const url = queryString
      ? `${PAYMENTS_BASE_URL}/stats/?${queryString}`
      : `${PAYMENTS_BASE_URL}/stats/`;

    return await api.get<PaymentEventStats>(url);
  },

  /**
   * Approve payments - moves from PENDING_APPROVAL to PROCESSING
   */
  async approvePayments(paymentEventIds: number[]): Promise<ApprovePaymentsResponse> {
    return await api.post<ApprovePaymentsResponse>(
      `${PAYMENTS_BASE_URL}/approve/`,
      { payment_event_ids: paymentEventIds }
    );
  },

  /**
   * Reject payments - moves from PENDING_APPROVAL to REJECTED
   */
  async rejectPayments(paymentEventIds: number[], reason?: string): Promise<RejectPaymentsResponse> {
    return await api.post<RejectPaymentsResponse>(
      `${PAYMENTS_BASE_URL}/reject/`,
      { payment_event_ids: paymentEventIds, reason }
    );
  },

  /**
   * Generate payment file for PROCESSING payments
   */
  async generatePaymentFile(
    paymentEventIds: number[],
    sourceBankAccountId: number,
    fileFormat: 'csv' | 'xml' = 'xml'
  ): Promise<GenerateFileResponse> {
    return await api.post<GenerateFileResponse>(
      `${PAYMENTS_BASE_URL}/generate-file/`,
      {
        payment_event_ids: paymentEventIds,
        source_bank_account_id: sourceBankAccountId,
        file_format: fileFormat,
      }
    );
  },

  /**
   * Deny payments - cancels payment and restores bill to payable status
   */
  async denyPayments(paymentEventIds: number[], reason?: string): Promise<DenyPaymentsResponse> {
    return await api.post<DenyPaymentsResponse>(
      `${PAYMENTS_BASE_URL}/deny/`,
      { payment_event_ids: paymentEventIds, reason }
    );
  },
};
