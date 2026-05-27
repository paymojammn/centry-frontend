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

// ---------------------------------------------------------------------------
// Sign-off (Rails > Ozow > Sign-off)
// ---------------------------------------------------------------------------

export interface OzowSignoffTest {
  slug: string;
  label: string;
  requires_payout_id: boolean;
}

export interface OzowSignoffTestsResponse {
  success: boolean;
  tests: OzowSignoffTest[];
}

/** Loose shape — each test returns slightly different keys, all JSON-safe. */
export type OzowSignoffResult = Record<string, unknown> & {
  payout_id?: string;
  status?: string | null;
  status_code?: number | null;
  sub_status?: string | null;
  sub_status_code?: number | null;
  error_message?: string;
  exception?: string;
  merchant_reference?: string;
  raw_response?: unknown;
  skipped?: string;
  expectation?: string;
  note?: string;
};

export interface OzowSignoffRunResponse {
  success: boolean;
  test: string;
  label: string;
  account_id: string;
  environment: 'sandbox' | 'production';
  // Optional: only payout tests resolve a destination bank.
  // ``collection-oneapi`` and any other ``requires_bank=False`` slug
  // omit this block.
  bank?: {
    bank_group_id: string;
    bank_group_name: string;
    branch_code: string;
  };
  result: OzowSignoffResult;
}

export interface OzowSignoffWebhookOutcome {
  found: boolean;
  payout_id?: string;
  merchant_reference?: string;
  status?: string;
  status_code?: number | null;
  sub_status_code?: number | null;
  error_message?: string;
  completed_at?: string | null;
  verification_received?: boolean;
  callback_count?: number;
  callbacks?: Array<Record<string, unknown>>;
  // Verify-webhook audit columns (migration 0030). Surfaced so the
  // sign-off UI can poll Test Case 3 until ``last_verify_result`` is
  // ``"verified"`` and show how many times Ozow has hit our endpoint.
  verify_call_count?: number;
  last_verified_at?: string | null;
  last_verify_ip?: string | null;
  last_verify_result?: string;
}

export interface OzowSignoffWebhookOutcomeResponse {
  success: boolean;
  account_id: string;
  outcome: OzowSignoffWebhookOutcome;
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

  // ---- Sign-off ---------------------------------------------------------

  /**
   * GET /api/ozow/signoff/tests/ — catalogue of sign-off tests.
   */
  async listSignoffTests(): Promise<OzowSignoffTestsResponse> {
    return api.get<OzowSignoffTestsResponse>(`${OZOW_BASE}/signoff/tests/`);
  },

  /**
   * POST /api/ozow/accounts/<id>/signoff/<slug>/ — run a single sign-off
   * test against a sandbox provider account. ``payout_id`` is required for
   * the get-status test.
   */
  async runSignoffTest(
    accountId: string,
    slug: string,
    body?: { payout_id?: string },
  ): Promise<OzowSignoffRunResponse> {
    return api.post<OzowSignoffRunResponse>(
      `${OZOW_BASE}/accounts/${accountId}/signoff/${slug}/`,
      body ?? {},
    );
  },

  /**
   * GET /api/ozow/accounts/<id>/signoff/webhook-outcome/<payoutId>/ —
   * inspect the OzowPayout + OzowCallback rows for a payoutId, used to
   * verify the four sign-off items Ozow drives via webhook.
   */
  async getSignoffWebhookOutcome(
    accountId: string,
    payoutId: string,
  ): Promise<OzowSignoffWebhookOutcomeResponse> {
    return api.get<OzowSignoffWebhookOutcomeResponse>(
      `${OZOW_BASE}/accounts/${accountId}/signoff/webhook-outcome/${payoutId}/`,
    );
  },
};

export default ozowApi;
