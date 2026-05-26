/**
 * OneGate (CallPay) API client (frontend).
 *
 * Wraps /payments/api/onegate/* endpoints. Focused on the sign-off workflow
 * driven by Rails > Onegate > Sign-off — the rest of the OneGate REST surface
 * is reachable directly via api.get/post and isn't typed here yet.
 */

import api from './api';

const ONEGATE_BASE = '/payments/api/onegate';

// ---------------------------------------------------------------------------
// Sign-off — Deposits
// ---------------------------------------------------------------------------

export type SignoffBadge = 'untested' | 'failures_only' | 'passed';

export interface OneGateSignoffIntent {
  will_use: boolean | null;
  notes: string;
}

/**
 * A single test transaction reference (one row in the OneGate UAT table).
 * For deposits these come from OneGate's gateway-transaction list; for
 * payouts they come from our local OneGatePayout rows.
 */
export interface OneGateTestRef {
  reference: string;
  status: string;
  /** Bucketed classification — what the badge logic uses. */
  classification: "paid" | "failed" | "pending" | "unknown";
  created: string | null;
  amount?: string | number | null;
}

export interface OneGateDepositRow {
  slug: string;
  payment_type: string;
  label: string;
  note?: string;
  /** Per-method test amount (vouchers force "0.00"). */
  default_amount: string;
  /** True for voucher payment_types — UI must lock amount to 0. */
  is_voucher: boolean;
  paid: number;
  failed: number;
  pending: number;
  total: number;
  last_paid: string | null;
  last_failed: string | null;
  /** Most-recent test transactions for this method (max 5, newest first). */
  references: OneGateTestRef[];
  status: SignoffBadge;
  intent: OneGateSignoffIntent;
}

export interface OneGateDepositMethodsResponse {
  success: boolean;
  methods: OneGateDepositRow[];
  transaction_count: number;
}

export interface OneGateDepositTestResponse {
  success: boolean;
  method: string;
  payment_type: string;
  merchant_reference: string;
  amount: string;
  key: string;
  redirect_url: string;
  raw_response?: unknown;
}

// ---------------------------------------------------------------------------
// Sign-off — Payouts
// ---------------------------------------------------------------------------

export interface OneGatePayoutRow {
  slug: string;
  name: string;
  paid: number;
  failed: number;
  pending: number;
  batched: number;
  total: number;
  /** True when OneGate requires id_number for this payout method. */
  rsa_id_required: boolean;
  /** Most-recent local OneGatePayout rows (max 5, newest first). */
  references: OneGateTestRef[];
  status: SignoffBadge;
  intent: OneGateSignoffIntent;
}

export interface OneGatePayoutMethodsResponse {
  success: boolean;
  methods: OneGatePayoutRow[];
}

export interface OneGatePayoutTestPayload {
  payout_method_slug: string;
  amount: string;
  first_name: string;
  surname: string;
  mobile: string;
  account_number?: string;
  branch_code?: string;
  id_number?: string;
  email?: string;
}

export interface OneGatePayoutTestResponse {
  success: boolean;
  transaction_id: string;
  reference: string;
  status: string;
  message: string;
  voucher: Record<string, unknown> | null;
  raw_response?: unknown;
}

// ---------------------------------------------------------------------------
// Sign-off — Intent
// ---------------------------------------------------------------------------

export interface OneGateIntentMap {
  deposits: Record<string, OneGateSignoffIntent>;
  payouts: Record<string, OneGateSignoffIntent>;
}

export interface OneGateIntentResponse {
  success: boolean;
  intent: OneGateIntentMap;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const onegateApi = {
  /** GET deposit-methods catalogue + per-method transaction stats. */
  async listDepositMethods(
    accountId: string,
    params: { from_date?: string; to_date?: string } = {},
  ): Promise<OneGateDepositMethodsResponse> {
    const query: Record<string, string> = {};
    if (params.from_date) query.from_date = params.from_date;
    if (params.to_date) query.to_date = params.to_date;
    return api.get<OneGateDepositMethodsResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/deposit-methods/`,
      { params: query },
    );
  },

  /** POST to start a hosted-checkout test deposit. */
  async startDepositTest(
    accountId: string,
    body: { slug: string; amount?: string; return_url?: string },
  ): Promise<OneGateDepositTestResponse> {
    return api.post<OneGateDepositTestResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/deposit-test/`,
      body,
    );
  },

  /** GET payout-method catalogue + per-method local payout stats. */
  async listPayoutMethods(
    accountId: string,
  ): Promise<OneGatePayoutMethodsResponse> {
    return api.get<OneGatePayoutMethodsResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/payout-methods/`,
    );
  },

  /** POST a test payout. */
  async startPayoutTest(
    accountId: string,
    body: OneGatePayoutTestPayload,
  ): Promise<OneGatePayoutTestResponse> {
    return api.post<OneGatePayoutTestResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/payout-test/`,
      body,
    );
  },

  /** GET persisted sign-off intent map. */
  async getIntent(accountId: string): Promise<OneGateIntentResponse> {
    return api.get<OneGateIntentResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/intent/`,
    );
  },

  /** PUT a partial intent update (merged server-side). */
  async updateIntent(
    accountId: string,
    body: {
      deposits?: Record<string, OneGateSignoffIntent>;
      payouts?: Record<string, OneGateSignoffIntent>;
    },
  ): Promise<OneGateIntentResponse> {
    return api.put<OneGateIntentResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/intent/update/`,
      body,
    );
  },
};

export default onegateApi;
