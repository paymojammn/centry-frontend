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

/**
 * One sync run (backend erp.SyncLog). `status` is `running` while the
 * Celery task works, then `completed` or `failed` (legacy webhook rows use
 * `success` / `partial`).
 */
export type SyncLogStatus = 'running' | 'started' | 'completed' | 'success' | 'partial' | 'failed';

export interface SyncLog {
  id: number;
  connection: string;
  connection_name: string;
  provider: { code: string; name: string } | null;
  organization: string;
  entity: string;
  operation: string;
  trigger: 'manual' | 'scheduled' | 'resync' | 'webhook' | 'api';
  status: SyncLogStatus;
  is_running: boolean;
  full_sync: boolean;
  since: string | null;
  celery_task_id: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  records_failed: number;
  error_message: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface SyncStatusResponse {
  connection_id: string;
  last_sync_at: string | null;
  entity: string;
  bills_total: number | null;
  latest: SyncLog | null;
}

export interface SyncLogsPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: SyncLog[];
}

/**
 * Response of the sync_* endpoints. Queued (202) when a Celery worker will
 * do the work — poll `getSyncStatus` — or `success` when it ran inline.
 */
export interface SyncBillsResponse {
  status: 'queued' | 'success' | string;
  message: string;
  task_id?: string;
  connection_id?: string;
  synced_count?: number;
  sync_log_id?: number;
  sync_log?: SyncLog;
}

export interface SyncBillsOptions {
  /** Ignore the incremental cursor and pull every bill. */
  full?: boolean;
  /** ISO timestamp or relative ("2h", "7d"). */
  since?: string;
}

export interface SyncLogsParams {
  organization?: string;
  connection?: string;
  entity?: string;
  status?: string;
  page?: number;
}

/**
 * Get ERP connections for current user's organizations.
 * Pass organizationId to scope to one org — the unscoped list is paginated
 * (100/page), so superusers can miss an org's connection without it.
 */
export async function getERPConnections(organizationId?: string): Promise<ERPConnection[]> {
  const qs = organizationId ? `?organization=${encodeURIComponent(organizationId)}` : '';
  return get<ERPConnection[]>(`/api/v1/erp/connections/${qs}`);
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
export async function syncBills(
  connectionId: string,
  options: SyncBillsOptions = {}
): Promise<SyncBillsResponse> {
  const params = new URLSearchParams();
  if (options.full) params.set('full', 'true');
  if (options.since) params.set('since', options.since);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return post<SyncBillsResponse>(`/api/v1/erp/connections/${connectionId}/sync_bills/${qs}`);
}

/**
 * Latest sync run for a connection (plus last_sync_at and the local bill
 * count). The UI polls this while `latest.is_running`.
 */
export async function getSyncStatus(
  connectionId: string,
  entity = 'bills'
): Promise<SyncStatusResponse> {
  return get<SyncStatusResponse>(
    `/api/v1/erp/connections/${connectionId}/sync-status/?entity=${encodeURIComponent(entity)}`
  );
}

/**
 * Sync history, newest first, paginated.
 */
export async function getSyncLogs(params: SyncLogsParams = {}): Promise<SyncLogsPage> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const qs = search.toString() ? `?${search.toString()}` : '';
  return get<SyncLogsPage>(`/api/v1/erp/sync-logs/${qs}`);
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
  getSyncStatus,
  getSyncLogs,
};

export default erpApi;
