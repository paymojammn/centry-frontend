// lib/purchases-api.ts
/**
 * API service for purchases/bills/payables
 */

import { apiRequest } from './api';
import type {
  Payable,
  Vendor,
  PaymentIntent,
  PayableStats,
  CreatePaymentIntentData,
} from '@/types/purchases';

const PURCHASES_BASE = '/api/v1/purchases';
const XERO_BASE = '/api/v1/xero';

/**
 * Bills/Payables API (from Xero)
 */
export async function getPayables(params?: {
  status?: string;
  vendor?: number;
  organization?: string;
}): Promise<Payable[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.vendor) queryParams.append('vendor', params.vendor.toString());
  if (params?.organization) queryParams.append('organization', params.organization);

  // Fetch from Xero bills API
  const url = `${XERO_BASE}/bills/${queryParams.toString() ? `?${queryParams}` : ''}`;
  return apiRequest<Payable[]>(url);
}

export async function getPayable(id: number): Promise<Payable> {
  return apiRequest<Payable>(`${PURCHASES_BASE}/payables/${id}/`);
}

export async function getPayableStats(organizationId?: string): Promise<PayableStats> {
  // Fetch stats from Xero bills API
  const queryParams = organizationId ? `?organization=${organizationId}` : '';
  const url = `${XERO_BASE}/bills/stats/${queryParams}`;
  console.log('Fetching stats from:', url);
  return apiRequest<PayableStats>(url);
}

/**
 * Vendors API
 */
export async function getVendors(organizationId?: string): Promise<Vendor[]> {
  const url = `${PURCHASES_BASE}/vendors/${organizationId ? `?organization=${organizationId}` : ''}`;
  return apiRequest<Vendor[]>(url);
}

export async function getVendor(id: number): Promise<Vendor> {
  return apiRequest<Vendor>(`${PURCHASES_BASE}/vendors/${id}/`);
}

/**
 * Payment Intents API
 */
export async function getPaymentIntents(params?: {
  payable?: number;
  status?: string;
}): Promise<PaymentIntent[]> {
  const queryParams = new URLSearchParams();
  if (params?.payable) queryParams.append('payable', params.payable.toString());
  if (params?.status) queryParams.append('status', params.status);

  const url = `${PURCHASES_BASE}/payment-intents/${queryParams.toString() ? `?${queryParams}` : ''}`;
  return apiRequest<PaymentIntent[]>(url);
}

export async function createPaymentIntent(data: CreatePaymentIntentData): Promise<PaymentIntent> {
  return apiRequest<PaymentIntent>(`${PURCHASES_BASE}/payment-intents/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent> {
  return apiRequest<PaymentIntent>(`${PURCHASES_BASE}/payment-intents/${id}/`);
}
