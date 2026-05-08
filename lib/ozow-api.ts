/**
 * Ozow Payouts API client (frontend).
 *
 * Wraps the /api/ozow/ endpoints exposed by the backend
 * (see centry-backend/payments/providers/momo/sa/ozow/api_views.py).
 */

import api from './api';

// The payments app is mounted under /payments/ in baihu/urls.py, with the
// Ozow namespace exposed at /payments/api/ozow/ (see payments/urls.py).
const OZOW_BASE = '/payments/api/ozow';

export interface OzowBank {
  bankGroupId: string;
  bankGroupName: string;
  universalBranchCode: string;
}

export interface OzowBanksResponse {
  success: boolean;
  banks: OzowBank[];
}

export interface OzowPayoutCreatePayload {
  amount: string | number;
  bank_group_id: string;
  account_number: string;
  branch_code: string;
  bank_name?: string;
  merchant_reference: string;
  customer_bank_reference: string;
  is_rtc?: boolean;
  ozow_account_id?: string;
  recipient_name?: string;
}

export interface OzowPayoutCreateResponse {
  success: boolean;
  status: string;
  provider_reference: string;
  merchant_reference: string;
  amount: string;
  currency: string;
  message: string;
}

export interface OzowPayoutStatusResponse {
  success: boolean;
  payout_id: string;
  status: string;
  status_code: number | null;
  sub_status: string;
  amount: string | null;
  merchant_reference: string;
  raw_response?: unknown;
}

export const ozowApi = {
  /**
   * GET /api/ozow/banks/
   *
   * Step 1 of the Ozow Payouts flow — populate the bank picker.
   * Banks rarely change; cache aggressively in React Query.
   */
  async listBanks(params: {
    ozowAccountId?: string;
    rtcOnly?: boolean;
  } = {}): Promise<OzowBanksResponse> {
    const query: Record<string, string> = {};
    if (params.ozowAccountId) query.ozow_account_id = params.ozowAccountId;
    if (params.rtcOnly) query.rtc_only = 'true';
    return api.get<OzowBanksResponse>(`${OZOW_BASE}/banks/`, { params: query });
  },

  /**
   * POST /api/ozow/payouts/create/
   *
   * Step 2 — submit a payout. Backend handles AES encryption + hash check
   * via OzowDisbursementAdapter and pre-creates the OzowPayout record so
   * the verify webhook can find the encryption key.
   */
  async createPayout(
    payload: OzowPayoutCreatePayload,
  ): Promise<OzowPayoutCreateResponse> {
    return api.post<OzowPayoutCreateResponse>(
      `${OZOW_BASE}/payouts/create/`,
      payload,
    );
  },

  /**
   * GET /api/ozow/payouts/<payout_id>/
   *
   * Status-check fallback — call this when the notification webhook
   * hasn't fired within the SLA window.
   */
  async getPayoutStatus(
    payoutId: string,
    ozowAccountId?: string,
  ): Promise<OzowPayoutStatusResponse> {
    const query: Record<string, string> = {};
    if (ozowAccountId) query.ozow_account_id = ozowAccountId;
    return api.get<OzowPayoutStatusResponse>(
      `${OZOW_BASE}/payouts/${payoutId}/`,
      { params: query },
    );
  },
};

export default ozowApi;
