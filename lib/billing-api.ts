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
  max_users: number | null;
  max_transactions_per_month: number | null;
  max_api_calls_per_day: number | null;
  max_erp_connections: number;
  features: Record<string, boolean>;
  sort_order: number;
}

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  plan_code: string;
  plan_name: string;
  is_active: boolean;
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
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
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
  checkout_url: string;
  session_id: string;
}

export interface BillingPortalResponse {
  portal_url: string;
}

// API Functions

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
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return get<SubscriptionStatus>('/api/billing/status/');
}

/**
 * Get full subscription details
 */
export async function getSubscriptionDetails(): Promise<OrganizationSubscription> {
  return get<OrganizationSubscription>('/api/billing/subscription/');
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  planCode: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSessionResponse> {
  return post<CheckoutSessionResponse>('/api/billing/checkout/', {
    plan_code: planCode,
    billing_cycle: billingCycle,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

/**
 * Create a Stripe billing portal session
 */
export async function createBillingPortalSession(
  returnUrl?: string
): Promise<BillingPortalResponse> {
  return post<BillingPortalResponse>('/api/billing/portal/', {
    return_url: returnUrl,
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
  token_type: string;
}> {
  return post('/api/auth/exchange/', {
    auth_code: authCode,
  });
}

/**
 * Helper to redirect to Stripe checkout
 */
export async function redirectToCheckout(
  planCode: string,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): Promise<void> {
  const { checkout_url } = await createCheckoutSession(
    planCode,
    billingCycle,
    `${window.location.origin}/billing/success`,
    `${window.location.origin}/billing/subscribe`
  );

  // Redirect to Stripe checkout
  window.location.href = checkout_url;
}

/**
 * Helper to redirect to Stripe billing portal
 */
export async function redirectToBillingPortal(): Promise<void> {
  const { portal_url } = await createBillingPortalSession(
    `${window.location.origin}/billing`
  );

  // Redirect to Stripe portal
  window.location.href = portal_url;
}

export const billingApi = {
  getSubscriptionPlans,
  getSubscriptionStatus,
  getSubscriptionDetails,
  createCheckoutSession,
  createBillingPortalSession,
  getPaymentHistory,
  getBillingEvents,
  cancelSubscription,
  exchangeAuthCode,
  redirectToCheckout,
  redirectToBillingPortal,
};

export default billingApi;
