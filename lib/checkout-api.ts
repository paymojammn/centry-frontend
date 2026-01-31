/**
 * Checkout API Service
 *
 * API client for the public checkout flow.
 * These endpoints use session tokens for authentication, not user auth tokens.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface CheckoutSession {
  id: string;
  reference: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  description: string;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  customer_country: string;
  allowed_countries: string[];
  success_url: string;
  cancel_url: string;
  expires_at: string;
  created_at: string;
  merchant: {
    name: string;
    logo_url: string | null;
  };
}

export interface PaymentMethod {
  code: string;
  name: string;
  description: string;
}

export interface PaymentProvider {
  provider: string;
  name: string;
  icon: string;
  color: string;
  requires_redirect: boolean;
  supports_inline: boolean;
  requires_phone: boolean;
  methods: PaymentMethod[];
}

export interface PaymentMethodsResponse {
  country: string;
  currency: string;
  methods: PaymentProvider[];
}

export interface Country {
  code: string;
  name: string;
  currency: string;
}

export interface CheckoutInfoResponse {
  session: CheckoutSession;
  countries: Country[];
  default_country: string | null;
}

export interface InitiatePaymentRequest {
  provider: string;
  payment_method: string;
  country: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
}

export interface InitiatePaymentResponse {
  payment_id: string;
  status: string;
  authorization_url: string | null;
  requires_redirect: boolean;
  requires_otp: boolean;
  message: string | null;
}

export interface PaymentStatusResponse {
  session_status: string;
  payment_status: string | null;
  payment_id: string | null;
  can_retry: boolean;
  message: string | null;
}

/**
 * Make a checkout API request (no auth required, uses session token in URL)
 */
async function checkoutRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'An error occurred',
    }));
    throw new Error(error.detail || error.message || error.error || 'Request failed');
  }

  return response.json();
}

/**
 * Get checkout session info
 */
export async function getCheckoutInfo(token: string): Promise<CheckoutInfoResponse> {
  return checkoutRequest<CheckoutInfoResponse>(`/api/v1/checkout/${token}/`);
}

/**
 * Get available payment methods for a country
 */
export async function getPaymentMethods(
  token: string,
  country: string
): Promise<PaymentMethodsResponse> {
  return checkoutRequest<PaymentMethodsResponse>(
    `/api/v1/checkout/${token}/methods/?country=${country}`
  );
}

/**
 * Initiate a payment
 */
export async function initiatePayment(
  token: string,
  data: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> {
  return checkoutRequest<InitiatePaymentResponse>(`/api/v1/checkout/${token}/pay/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get payment status
 */
export async function getPaymentStatus(token: string): Promise<PaymentStatusResponse> {
  return checkoutRequest<PaymentStatusResponse>(`/api/v1/checkout/${token}/status/`);
}

export const checkoutApi = {
  getCheckoutInfo,
  getPaymentMethods,
  initiatePayment,
  getPaymentStatus,
};

export default checkoutApi;
