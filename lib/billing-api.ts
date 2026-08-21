/**
 * Billing API Service
 *
 * Handles subscription management, payment processing, and billing status
 */

import { get, post } from './api';

// Types
export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  monthly_price: string;
  annual_price: string;
  currency: string;
  trial_days: number;
  transaction_fee: string;
  max_users: number | null;
  max_transactions_per_month: number | null;
  max_api_calls_per_day: number | null;
  max_erp_connections: number;
  features: Record<string, boolean>;
  highlight_features: string[];
  excluded_features: string[];
  is_featured: boolean;
  cta_label: string;
  sort_order: number;
}

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  plan_code: string;
  plan_name: string;
  is_active: boolean;
  /** Caller-specific: true when the subscription allows access OR the caller
   *  is staff (staff bypass billing). The dashboard gate keys off this. */
  access_allowed?: boolean;
  is_trial: boolean;
  days_remaining: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  features: Record<string, boolean>;
}

export interface OrganizationSubscription {
  id: string;
  organization_name: string;
  tenant_id: string;
  erp_provider: string;
  plan: SubscriptionPlan;
  status: string;
  billing_cycle: 'monthly' | 'annual';
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
  payment_method_last4: string;
  payment_method_brand: string;
  days_remaining: number;
  is_access_allowed: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  payment_method: string;
  invoice_number: string;
  invoice_url: string;
  description: string;
  paid_at: string | null;
  created_at: string;
}

export interface BillingEvent {
  id: string;
  event_type: string;
  event_type_display: string;
  description: string;
  created_at: string;
}

export interface CheckoutSessionResponse {
  session_id: string;
  status: 'pending' | 'processing' | 'pending_verification' | 'completed' | 'failed' | 'expired' | 'cancelled';
  payment_method: string;
  amount: string;
  currency: string;
  redirect_url: string | null;
}

export interface CheckoutStatusResponse {
  session_id: string;
  status: 'pending' | 'processing' | 'pending_verification' | 'completed' | 'failed' | 'expired' | 'cancelled';
  payment_method: string;
  amount: string;
  currency: string;
  failure_reason: string;
  completed_at: string | null;
}

export type PaymentMethodCode = 'mtn_momo' | 'airtel_money' | 'ozow_eft';

/**
 * A rail we can actually charge — resolved from the provider accounts an
 * operator flagged as subscription accounts, not from the customer's own
 * linked accounts.
 */
export interface BillingPaymentMethod {
  code: PaymentMethodCode;
  name: string;
  type: 'mobile_money' | 'eft';
  provider: string;
  description: string;
  requires_phone: boolean;
  currency: string;
  environment: string;
}

export interface BillingPaymentMethodsResponse {
  methods: BillingPaymentMethod[];
  manual: { available: boolean; count: number };
}

export interface ManualPaymentMethodInfo {
  id: string;
  name: string;
  method_type: 'mobile_money' | 'bank_account';
  provider: string;
  country: string;
  currency: string;
  icon_url: string;
  // Mobile money
  merchant_code?: string;
  merchant_name?: string;
  phone_number?: string;
  ussd_instructions?: string;
  // Bank
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  branch_code?: string;
  swift_code?: string;
  reference_instructions?: string;
}


// API Functions

/**
 * Get the payment methods checkout can charge.
 *
 * Served from /api/billing/, which the billing middleware exempts — a customer
 * whose trial has expired must still be able to load the checkout page to pay.
 */
export async function getBillingPaymentMethods(): Promise<BillingPaymentMethodsResponse> {
  return get('/api/billing/payment-methods/');
}

/**
 * Get our bank accounts and merchant codes for customers paying manually.
 */
export async function getManualPaymentMethods(): Promise<ManualPaymentMethodInfo[]> {
  const response = await get<{ methods: ManualPaymentMethodInfo[] }>(
    '/api/billing/manual-methods/'
  );
  return response.methods || [];
}

/**
 * Get available subscription plans (public endpoint)
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await get<{ results: SubscriptionPlan[] }>('/api/billing/plans/');
  return response.results || [];
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(organizationId?: string): Promise<SubscriptionStatus> {
  // Billing is per-org: when the paywall bounced the user here for a
  // specific (possibly non-primary) org, ask about THAT org.
  const params = organizationId ? `?organization_id=${organizationId}` : '';
  return get<SubscriptionStatus>(`/api/billing/status/${params}`);
}

/**
 * Get full subscription details
 */
export async function getSubscriptionDetails(): Promise<OrganizationSubscription> {
  return get<OrganizationSubscription>('/api/billing/subscription/');
}

/**
 * Create a checkout session using Paymoja's own payment rails
 */
export async function createCheckoutSession(
  planCode: string,
  billingCycle: 'monthly' | 'annual',
  paymentMethod: PaymentMethodCode,
  payerIdentifier?: string,
  organizationId?: string,
): Promise<CheckoutSessionResponse> {
  return post<CheckoutSessionResponse>('/api/billing/checkout/', {
    plan_code: planCode,
    billing_cycle: billingCycle,
    payment_method: paymentMethod,
    payer_identifier: payerIdentifier || '',
    ...(organizationId ? { organization_id: organizationId } : {}),
  });
}

/**
 * Poll checkout session status
 */
export async function getCheckoutStatus(sessionId: string): Promise<CheckoutStatusResponse> {
  return get<CheckoutStatusResponse>(`/api/billing/checkout/${sessionId}/status/`);
}

/**
 * Submit manual payment notification
 */
export async function submitManualPayment(
  planCode: string,
  billingCycle: 'monthly' | 'annual',
  paymentMethodId: string,
  reference: string,
  organizationId?: string,
): Promise<{ session_id: string; status: string; message: string }> {
  return post('/api/billing/checkout/manual/', {
    plan_code: planCode,
    billing_cycle: billingCycle,
    payment_method_id: paymentMethodId,
    reference,
    ...(organizationId ? { organization_id: organizationId } : {}),
  });
}

/**
 * Get payment history
 */
export async function getPaymentHistory(): Promise<Payment[]> {
  const response = await get<{ payments: Payment[] }>('/api/billing/payments/');
  return response.payments || [];
}

/**
 * Get billing events (audit trail)
 */
export async function getBillingEvents(): Promise<BillingEvent[]> {
  const response = await get<{ events: BillingEvent[] }>('/api/billing/events/');
  return response.events || [];
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  atPeriodEnd: boolean = true
): Promise<{
  status: string;
  at_period_end: boolean;
  current_period_end: string;
}> {
  return post('/api/billing/cancel/', {
    at_period_end: atPeriodEnd,
  });
}

/**
 * Exchange auth code for tokens (secure token exchange)
 */
export async function exchangeAuthCode(
  authCode: string
): Promise<{
  access_token: string;
  refresh_token: string;
  subscription_status: string | null;
  has_active_subscription: boolean;
  /** Org tied to the ERP just signed in with — used to land on the right org. */
  organization_id: string | null;
  token_type: string;
}> {
  return post('/api/auth/exchange/', {
    auth_code: authCode,
  });
}

/**
 * Start checkout and handle redirect (for Ozow) or return session for polling (MoMo/Airtel)
 */
export async function startCheckout(
  planCode: string,
  billingCycle: 'monthly' | 'annual',
  paymentMethod: PaymentMethodCode,
  payerIdentifier?: string,
  organizationId?: string,
): Promise<CheckoutSessionResponse> {
  const session = await createCheckoutSession(
    planCode, billingCycle, paymentMethod, payerIdentifier, organizationId
  );

  // For Ozow, redirect to external payment page
  if (session.redirect_url && paymentMethod === 'ozow_eft') {
    window.location.href = session.redirect_url;
  }

  return session;
}

export const billingApi = {
  getSubscriptionPlans,
  getBillingPaymentMethods,
  getManualPaymentMethods,
  getSubscriptionStatus,
  getSubscriptionDetails,
  createCheckoutSession,
  getCheckoutStatus,
  startCheckout,
  submitManualPayment,
  getPaymentHistory,
  getBillingEvents,
  cancelSubscription,
  exchangeAuthCode,
};

export default billingApi;
