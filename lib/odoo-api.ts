/**
 * Odoo API Service
 *
 * Odoo authenticates with a per-user API key + database (JSON-2 API), not
 * OAuth. `signInWithOdoo` posts the credentials to the backend, which validates
 * them, provisions the user/org/connection and returns JWT tokens directly.
 * The remaining helpers cover connect/sync/push for authenticated users.
 */

import { getApiUrl } from '@/config/api';

import { get, post } from './api';

export interface OdooSignInResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  redirect_url: string;
  has_active_subscription: boolean;
  subscription_status: string | null;
  organization_id: string;
}

/** Sign in with an Odoo API key (used from the login page — unauthenticated). */
export async function signInWithOdoo(params: {
  base_url: string;
  api_key: string;
  database?: string;
  redirect_url?: string;
}): Promise<OdooSignInResult> {
  const apiUrl = getApiUrl();
  const res = await fetch(`${apiUrl}/api/auth/odoo/signin/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Odoo sign-in failed');
  }
  return data as OdooSignInResult;
}

const BASE = '/api/v1/odoo';

/** Connect an already-authenticated org to an Odoo instance. */
export async function connectOdoo(payload: {
  organization_id: string;
  base_url: string;
  api_key: string;
  database?: string;
  company_name?: string;
}): Promise<unknown> {
  return post(`${BASE}/connect`, payload);
}

export async function testOdooConnection(connectionId: string): Promise<{ success: boolean; error?: string }> {
  return post(`${BASE}/connections/${connectionId}/test`);
}

export async function syncOdoo(
  connectionId: string
): Promise<{ detail: string; counts: Record<string, number> }> {
  return post(`${BASE}/connections/${connectionId}/sync`);
}

export async function pushToOdoo(
  connectionId: string,
  docType: 'invoice' | 'bill' | 'payment',
  payload: Record<string, unknown>
): Promise<{ detail: string; id: number }> {
  return post(`${BASE}/connections/${connectionId}/push/${docType}`, payload);
}

export async function getOdooInvoices(): Promise<unknown> {
  return get(`${BASE}/invoices/`);
}

export async function getOdooBills(): Promise<unknown> {
  return get(`${BASE}/bills/`);
}

export const odooApi = {
  signInWithOdoo,
  connectOdoo,
  testOdooConnection,
  syncOdoo,
  pushToOdoo,
  getOdooInvoices,
  getOdooBills,
};

export default odooApi;
