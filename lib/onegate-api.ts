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
  /** True when this method needs a bank account_number + branch_code. */
  requires_bank_account?: boolean;
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
  id_type?: string;
  date_of_birth?: string;
  title?: string;
  nationality?: string;
  country_of_issue?: string;
}

/** DB-backed OTT payout method (from /payout-catalog/). */
export interface OneGatePayoutCatalogMethod {
  slug: string;
  name: string;
  description: string;
  currency: string;
  min_amount: string;
  max_amount: string;
  action_time: string;
  rsa_id_required: boolean;
  requires_bank_account: boolean;
}

/** A bank participating in account-based payouts (RTC / PayShap). */
export interface OneGatePayoutCatalogBank {
  name: string;
  branch_code: string;
  supports_rtc: boolean;
  supports_payshap: boolean;
  note: string;
}

export interface OneGatePayoutCatalogResponse {
  success: boolean;
  methods: OneGatePayoutCatalogMethod[];
  banks: OneGatePayoutCatalogBank[];
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
// Sign-off Test Cases — uniform request/response envelope per step
// ---------------------------------------------------------------------------
//
// Every runnable test case (Test Case 1, 2, 3, ...) returns the same
// shape so a single ``<TestCaseSection>`` component on the page renders
// all of them and the exports use one row builder. Steps without an
// HTTP call (e.g. local config checks) set ``request``/``response`` to
// null; ``extras`` carries step-specific context.

export interface OneGateSignoffStepRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface OneGateSignoffStepResponse {
  status_code: number;
  body: unknown;
  latency_ms: number | null;
}

export interface OneGateSignoffStep {
  slug: string;
  label: string;
  passed: boolean;
  detail: string;
  request: OneGateSignoffStepRequest | null;
  response: OneGateSignoffStepResponse | null;
  extras?: Record<string, unknown> | null;
}

export interface OneGateSignoffTestCaseResult {
  test_case: number;
  label: string;
  summary: 'passed' | 'failed';
  ran_at: string;
  steps: OneGateSignoffStep[];
}

export interface OneGateSignoffTestCaseResponse {
  success: boolean;
  account_id: string;
  account_name: string;
  environment: 'sandbox' | 'production';
  result: OneGateSignoffTestCaseResult;
}

// Legacy aliases kept temporarily so the previously-shipped Test Case 1
// imports keep type-checking.
export type OneGateWebhookComplianceResult = OneGateSignoffTestCaseResult;
export type OneGateWebhookComplianceResponse = OneGateSignoffTestCaseResponse;
export type OneGateWebhookComplianceCheck = OneGateSignoffStep;

export interface OneGateValidateAccountPayload {
  bank?: string;
  branch?: string;
  account_number?: string;
  account_type?: string;
  customer_name?: string;
}

export interface OneGateQueuePayoutPayload
  extends OneGateValidateAccountPayload {
  amount?: string;
  reference?: string;
}

export interface OneGateServiceRedirectPayload {
  payment_type?: string;
  amount?: string;
  merchant_reference?: string;
}

export interface OneGateCardTokenDirectPayload {
  merchant_reference?: string;
  pan?: string;
  expiry?: string;
  cvv?: string;
  amount?: string;
}

export interface OneGatePaymentSchedulePayload {
  token_guid?: string;
  interval?: string;
  amount?: string;
  start_date?: string;
  count?: string;
}

export interface OneGateEftSecurePayload {
  amount?: string;
  merchant_reference?: string;
  use_custom_beneficiary?: boolean;
  beneficiary_account_number?: string;
  beneficiary_name?: string;
  beneficiary_account_type?: string;
  beneficiary_bank?: string;
}

export interface OneGatePayDirectPayload {
  pan?: string;
  expiry?: string;
  cvv?: string;
  amount?: string;
  merchant_reference?: string;
  first_name?: string;
  last_name?: string;
}

export interface OneGateVoucherPaymentPayload {
  payment_type?: string;
  amount?: string;
  merchant_reference?: string;
}

export interface OneGateReconPayload {
  transaction_id?: string;
  merchant_reference?: string;
  payment_key?: string;
  do_refund?: boolean;
  refund_amount?: string;
  do_resend_webhook?: boolean;
  resend_webhook_url?: string;
}

// Updated payload shape for TC4 (refactored from queue → OTT REST).
export interface OneGateOttPayoutPayload {
  payout_method_slug?: string;
  reference?: string;
  amount?: string;
  first_name?: string;
  surname?: string;
  mobile?: string;
  id_number?: string;
  id_type?: string;
  date_of_birth?: string;
  title?: string;
  nationality?: string;
  country_of_issue?: string;
}

// Reference enums exposed by ``GET /api/onegate/constants/``.  Single
// source of truth for banks / account types / payment types / etc. —
// no hard-coding on the frontend, per the OneGate "Constants" docs
// directive.

export interface OneGatePaymentMethodRef {
  slug: string;
  label: string;
  /** Wire-level ``payment_type`` value sent to OneGate's payment-key
   *  API (e.g. ``credit_card``, ``eft``, ``ozow_eft``). */
  payment_type: string;
  /** Which of the three OneGate integration modes this method
   *  supports. One of ``enterprise``, ``checkout``, ``redirect``. */
  integration_methods: string[];
}

export interface OneGateIntegrationMethodRef {
  slug: string;
  label: string;
  description: string;
}

export interface OneGateConstants {
  service_ids: Record<string, string>;
  gateway_ids: Record<string, string>;
  payment_methods: OneGatePaymentMethodRef[];
  integration_methods: OneGateIntegrationMethodRef[];
  user_roles: string[];
  wallet_payment_options: string[];
  account_types: string[];
  beneficiary_banks: string[];
  universal_branch_codes: Record<string, string>;
  schedule_intervals: string[];
  payment_types: string[];
  voucher_payment_types: string[];
  rsa_id_required_payout_methods: string[];
  /** Per-method payout bounds (ZAR rand) from OneGate's UAT feedback. */
  payout_amount_limits: Record<
    string,
    { min: string; max: string; action_time: string }
  >;
  /** Bank name → universal branch code for PayShap account payouts. */
  payshap_participating_banks: Record<string, string>;
  /** Bank name → universal branch code for RTC payouts. */
  rtc_participating_banks: Record<string, string>;
  payout_status_map: Record<string, string>;
  terminal_statuses: string[];
  success_statuses: string[];
  failed_statuses: string[];
  webhook_actions: string[];
  webhook_ip_whitelist: string[];
  currency: string;
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

  /** DB-backed OTT payout catalog (methods + participating banks). */
  async getPayoutCatalog(): Promise<OneGatePayoutCatalogResponse> {
    return api.get<OneGatePayoutCatalogResponse>(`${ONEGATE_BASE}/payout-catalog/`);
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

  /** Test Case 1: Verify webhook best-practices compliance.
   *  POSTs to the backend runner that checks (a) the documented CallPay
   *  IPs are whitelisted and (b) GET /gateway-transaction/{id} is
   *  reachable. Result is paste-ready for CallPay support. */
  async runWebhookCompliance(
    accountId: string,
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/webhook-compliance/`,
      {},
    );
  },

  /** Test Case 2: Verify API V2 authentication round-trip.
   *  Mints fresh Auth-Token / Org-Id / Timestamp headers and fires a
   *  live GET /eft-banks call. Returns both the outgoing request envelope
   *  and the response so the merchant can see exactly what was sent and
   *  what came back. */
  async runApiV2AuthTest(
    accountId: string,
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/api-v2-auth/`,
      {},
    );
  },

  /** Test Case 3: Validate Account API request.
   *  Fires POST /api/v2/payout/validate-account with whatever fields
   *  the merchant typed (or the docs example when fields are blank).
   *  Returns the outgoing request + the OneGate response so the merchant
   *  can see the CDV check result and confirm the endpoint is healthy. */
  async runValidateAccountTest(
    accountId: string,
    payload: OneGateValidateAccountPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/validate-account/`,
      payload,
    );
  },

  /** Test Case 4: OTT Payouts — Discover → Perform → Balance → Status.
   *  Refactored from the legacy /payout/queue flow to the modern
   *  /api/v2/ott-payouts/rest endpoint per the docs recommendation.
   *  Step 2 actually disburses — defaults to ott-voucher / R1.00. */
  async runQueuePayoutTest(
    accountId: string,
    payload:
      | OneGateOttPayoutPayload
      | OneGateQueuePayoutPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/queue-payout/`,
      payload,
    );
  },

  /** Backend-sourced reference enums (banks, account types, etc.).
   *  Avoids hard-coding on the frontend — per the OneGate "Constants"
   *  docs directive: "store the status and constants in backend, don't
   *  hard code anything for any integration". */
  async getConstants(): Promise<OneGateConstants> {
    return api.get<OneGateConstants>(`${ONEGATE_BASE}/constants/`);
  },

  /** Test Case 12: List Organisation Services.
   *  Fires the canonical auth-proving call from CallPay's docs
   *  (``GET /api/v2/organisation/{org_id}/services``) and returns
   *  the full request + response envelope. */
  async runListOrgServicesTest(
    accountId: string,
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/list-org-services/`,
      {},
    );
  },

  /** Test Case 5: Service Redirect (Bill-Payment Hosted Checkout).
   *  Mints a payment-key and returns the hosted-checkout URL the
   *  payer would be redirected to. Used for bill-payments + collections
   *  — Service Redirect mode per the architectural decision. */
  async runServiceRedirectTest(
    accountId: string,
    payload: OneGateServiceRedirectPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/service-redirect/`,
      payload,
    );
  },

  /** Test Case 6: Credit Card Token (Enterprise) end-to-end.
   *  Runs card-enquiry → tokenise → pay-with-token in sequence
   *  against OneGate's Enterprise endpoints. Use the docs test card
   *  4242 4242 4242 4242 for sign-off — the gateway recognises it as
   *  a test number and refuses to charge, which is the expected
   *  outcome. */
  async runCardTokenDirectTest(
    accountId: string,
    payload: OneGateCardTokenDirectPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/card-token-direct/`,
      payload,
    );
  },

  /** Test Case 8: Payment Schedule (CRUD).
   *  Runs Create → View → Update → Delete against a token guid.
   *  Requires a guid from a successful Test Case 6 run. */
  async runPaymentScheduleTest(
    accountId: string,
    payload: OneGatePaymentSchedulePayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/payment-schedule/`,
      payload,
    );
  },

  /** Test Case 9: EFTsecure end-to-end.
   *  Banks lookup → Payment Key → optional custom beneficiary.
   *  Same payment key drives all three EFTsecure modes (Hosted /
   *  Self Hosted / Checkout). */
  async runEftSecureTest(
    accountId: string,
    payload: OneGateEftSecurePayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/eftsecure/`,
      payload,
    );
  },

  /** Test Case 7: Credit Card — Server to Server (Pay Direct).
   *  PCI-scope server-to-server card payment. Use test cards only.
   *  Returns either type=result (direct settlement) or type=3ds_redirect
   *  (3DS challenge). */
  async runPayDirectTest(
    accountId: string,
    payload: OneGatePayDirectPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/pay-direct/`,
      payload,
    );
  },

  /** Test Case 10: Voucher Payment Setup.
   *  Mints a payment-key for one of the five voucher payment types
   *  with the docs ``amount=0`` (full redemption) by default. */
  async runVoucherPaymentTest(
    accountId: string,
    payload: OneGateVoucherPaymentPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/voucher-payment/`,
      payload,
    );
  },

  /** Test Case 11: Transaction Recon & Tooling.
   *  List + View transactions (read-only) plus opt-in Refund and
   *  Resend Webhook steps. */
  async runReconTest(
    accountId: string,
    payload: OneGateReconPayload = {},
  ): Promise<OneGateSignoffTestCaseResponse> {
    return api.post<OneGateSignoffTestCaseResponse>(
      `${ONEGATE_BASE}/accounts/${accountId}/signoff/recon/`,
      payload,
    );
  },
};

export default onegateApi;
