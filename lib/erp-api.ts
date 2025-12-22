/**
 * ERP Connections API Service
 * Handles ERP connection and sync operations
 */

import { get, post } from './api';

export interface ERPConnection {
  id: string;
  name: string;
  organization: {
    id: string;
    name: string;
  };
  provider: {
    code: string;
    name: string;
  };
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface SyncBillsResponse {
  status: string;
  synced_count: number;
  message: string;
}

/**
 * Get ERP connections for current user's organizations
 */
export async function getERPConnections(): Promise<ERPConnection[]> {
  return get<ERPConnection[]>('/api/v1/erp/connections/');
}

/**
 * Get a specific ERP connection
 */
export async function getERPConnection(id: string): Promise<ERPConnection> {
  return get<ERPConnection>(`/api/v1/erp/connections/${id}/`);
}

/**
 * Sync bills from ERP system
 */
export async function syncBills(connectionId: string): Promise<SyncBillsResponse> {
  return post<SyncBillsResponse>(`/api/v1/erp/connections/${connectionId}/sync_bills/`);
}

/**
 * Sync contacts from ERP system
 */
export async function syncContacts(connectionId: string): Promise<SyncBillsResponse> {
  return post<SyncBillsResponse>(`/api/v1/erp/connections/${connectionId}/sync_contacts/`);
}

/**
 * Sync accounts from ERP system
 */
export async function syncAccounts(connectionId: string): Promise<SyncBillsResponse> {
  return post<SyncBillsResponse>(`/api/v1/erp/connections/${connectionId}/sync_accounts/`);
}

/**
 * Sync invoices (sales/receivables) from ERP system
 */
export async function syncInvoices(connectionId: string): Promise<SyncBillsResponse> {
  return post<SyncBillsResponse>(`/api/v1/erp/connections/${connectionId}/sync_invoices/`);
}

export const erpApi = {
  getERPConnections,
  getERPConnection,
  syncBills,
  syncContacts,
  syncAccounts,
  syncInvoices,
};

export default erpApi;
