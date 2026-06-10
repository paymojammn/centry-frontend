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

const BILLS_BASE_URL = '/api/v1/erp/bills';
const XERO_BILLS_BASE_URL = '/api/v1/xero/bills';
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
    const res = await api.get<{ results: Bill[] } | Bill[]>(url);
    return Array.isArray(res) ? res : (res as any).results ?? res;
  },

  /**
   * Get a single bill by ID
   */
  async getBill(id: number): Promise<Bill> {
    return await api.get<Bill>(`${XERO_BILLS_BASE_URL}/${id}/`);
  },

  /**
   * Get bill statistics
   */
  async getBillStats(organizationId?: string): Promise<BillStats> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization', organizationId);
    const queryString = params.toString();

    const url = queryString
      ? `${XERO_BILLS_BASE_URL}/stats/?${queryString}`
      : `${XERO_BILLS_BASE_URL}/stats/`;

    return await api.get<BillStats>(url);
  },

  /**
   * Get available payment providers
   */
  async getPaymentProviders(countryCode: string = 'UG'): Promise<PaymentProviders> {
    return await api.get<PaymentProviders>(
      `${XERO_BILLS_BASE_URL}/payment_providers/?country=${countryCode}`
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
      `${XERO_BILLS_BASE_URL}/check_wallet_balance/`,
      { bills, currency }
    );
  },

  /**
   * Get an FX quote. Use when the source account's currency differs from
   * the bill's currency. The quote has a 5-minute freshness window — the
   * pay endpoint will re-quote if submission happens after expiry.
   */
  async getFxQuote(from: string, to: string, amount: string | number): Promise<{
    from_currency: string;
    to_currency: string;
    amount: string;
    converted_amount: string;
    rate: string;
    provider: string;
    fetched_at: string;
    expires_at: string;
  }> {
    const params = new URLSearchParams({
      from,
      to,
      amount: String(amount),
    });
    return await api.get(`${XERO_BILLS_BASE_URL}/fx-quote/?${params.toString()}`);
  },

  /**
   * Process bill payment(s)
   */
  async payBills(payload: BillPaymentPayload): Promise<BillPaymentResponse> {
    return await api.post<BillPaymentResponse>(
      `${XERO_BILLS_BASE_URL}/pay/`,
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
   * Send provider payout (Ozow, Paystack, etc.) for PROCESSING payments
   */
  async sendProviderPayout(paymentEventIds: number[]): Promise<any> {
    return await api.post<any>(
      `${PAYMENTS_BASE_URL}/send-provider-payout/`,
      { payment_event_ids: paymentEventIds }
    );
  },

  /**
   * Edit a provider payout's recipient details before a re-run.
   * Allowed only while the event is PROCESSING or ERROR_PAYMENT.
   */
  async updatePayoutDetails(paymentEventId: number, details: Record<string, string>): Promise<any> {
    return await api.patch<any>(
      `${PAYMENTS_BASE_URL}/${paymentEventId}/payout-details/`,
      details
    );
  },

  /**
   * Generate a checkout payment for an approved Ozow/OneGate bill payment.
   *
   * Returns a `payment_link` (the provider's hosted page) plus, for OneGate,
   * the self-hosted V4 widget coordinates `service_url` (serviceUrl) and
   * `payment_key` (paymentKey). When both are present the caller can embed
   * the checkout in-page via `launchOneGateCheckout`; otherwise it falls back
   * to opening `payment_link`.
   */
  async generatePaymentLink(
    paymentEventId: number,
    amount?: string,
    paymentType?: string,
  ): Promise<{
    success: boolean;
    payment_link: string;
    service_url?: string;
    payment_key?: string;
    amount?: string;
    existing?: boolean;
  }> {
    return await api.post(
      `${PAYMENTS_BASE_URL}/${paymentEventId}/generate-link/`,
      {
        ...(amount ? { amount } : {}),
        ...(paymentType ? { payment_type: paymentType } : {}),
      }
    );
  },

  /**
   * Revert an in-flight hosted-checkout payment back to the approved
   * (PROCESSING) state after the embedded checkout fails or is cancelled,
   * so it can be retried instead of staying stuck as "Sent".
   */
  async revertToApproved(
    paymentEventId: number,
    reason?: string,
  ): Promise<{ success: boolean; id: number; provider_status: string }> {
    return await api.post(
      `${PAYMENTS_BASE_URL}/${paymentEventId}/revert-to-approved/`,
      reason ? { reason } : {},
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

  /**
   * Reverse a completed payment. Restores the bill (amount_due/amount_paid,
   * status), marks the event REVERSED, flags synced_to_xero=False so Xero
   * re-syncs. Only valid from SUCCESS_PAYMENT / SENT_PAYMENT / ERROR_PAYMENT.
   */
  async reversePayment(paymentEventId: number, reason: string): Promise<{
    success: boolean;
    payment_event_id: number;
    status: string;
    bill_restored: boolean;
  }> {
    return await api.post(`${PAYMENTS_BASE_URL}/${paymentEventId}/reverse/`, { reason });
  },
};
