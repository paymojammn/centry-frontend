/**
 * ERPNext (Frappe) API Service
 *
 * Thin client for ERPNext-specific connection, sync and push endpoints
 * (mounted at /api/v1/erpnext/). Generic ERP reads/syncs still go through
 * lib/erp-api.ts — this covers the ERPNext-only push operations.
 */

import { get, post } from './api';

export interface ERPNextConnection {
  id: string;
  erp_connection: string;
  site_url: string;
  company_name: string;
  default_currency: string;
  is_frappe_cloud: boolean;
  frappe_cloud_site: string;
  created_at: string;
  updated_at: string;
}

export interface ERPNextTestResult {
  success: boolean;
  user?: string;
  error?: string;
}

export interface ERPNextPushResult {
  detail: string;
  name: string;
  doc: Record<string, unknown>;
}

const BASE = '/api/v1/erpnext';

/** Connect an organization to an ERPNext instance via API key/secret. */
export async function connectERPNext(payload: {
  organization_id: string;
  site_url: string;
  api_key: string;
  api_secret: string;
  company_name?: string;
}): Promise<ERPNextConnection> {
  return post<ERPNextConnection>(`${BASE}/connect`, payload);
}

/** Test an existing ERPNext connection. */
export async function testERPNextConnection(connectionId: string): Promise<ERPNextTestResult> {
  return post<ERPNextTestResult>(`${BASE}/connections/${connectionId}/test`);
}

/** Trigger a full sync (contacts, invoices, bills, payments) from ERPNext. */
export async function syncERPNext(
  connectionId: string
): Promise<{ detail: string; counts: Record<string, number> }> {
  return post(`${BASE}/connections/${connectionId}/sync`);
}

/**
 * Push a document into ERPNext.
 * docType: 'invoice' (Sales Invoice) | 'bill' (Purchase Invoice) | 'payment' (Payment Entry)
 */
export async function pushToERPNext(
  connectionId: string,
  docType: 'invoice' | 'bill' | 'payment',
  payload: Record<string, unknown>
): Promise<ERPNextPushResult> {
  return post<ERPNextPushResult>(`${BASE}/connections/${connectionId}/push/${docType}`, payload);
}

/** List synced ERPNext invoices for the current user's organizations. */
export async function getERPNextInvoices(): Promise<unknown> {
  return get(`${BASE}/invoices/`);
}

/** List synced ERPNext bills for the current user's organizations. */
export async function getERPNextBills(): Promise<unknown> {
  return get(`${BASE}/bills/`);
}

export const erpnextApi = {
  connectERPNext,
  testERPNextConnection,
  syncERPNext,
  pushToERPNext,
  getERPNextInvoices,
  getERPNextBills,
};

export default erpnextApi;
