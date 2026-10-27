/**
 * React Query hooks for ERP Connections
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erpApi } from '@/lib/erp-api';
import type {
  SyncBillsOptions,
  SyncBillsResponse,
  SyncLogsParams,
  SyncStatusResponse,
} from '@/lib/erp-api';
import { isSyncRunning } from '@/lib/erp-sync';
import { toast } from 'sonner';

/** Query keys touched when a bill sync finishes. */
const BILL_QUERY_KEYS: string[][] = [['bills'], ['bill-stats'], ['erp-connections'], ['erp-sync-logs']];

const SYNC_POLL_INTERVAL_MS = 3000;

/**
 * Hook to fetch ERP connections.
 * - undefined: all connections the user can see
 * - string: only that organization's connections
 * - null: organization not chosen yet — query is held until it is
 */
export function useERPConnections(organizationId?: string | null) {
  return useQuery({
    queryKey: ['erp-connections', organizationId ?? 'all'],
    queryFn: () => erpApi.getERPConnections(organizationId ?? undefined),
    enabled: organizationId !== null,
  });
}

/**
 * Hook to fetch a single ERP connection
 */
export function useERPConnection(id: string) {
  return useQuery({
    queryKey: ['erp-connection', id],
    queryFn: () => erpApi.getERPConnection(id),
    enabled: !!id,
  });
}

/**
 * Hook to sync bills from ERP.
 *
 * The backend queues a Celery task and answers 202 `{status: "queued",
 * task_id}`; the actual result arrives through `useSyncStatus`, which
 * invalidates the bills queries once the run finishes. When the backend had
 * to run inline (`status: "success"`) we invalidate right away.
 */
export function useSyncBills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      connectionId,
      options,
    }: {
      connectionId: string;
      options?: SyncBillsOptions;
    }) => erpApi.syncBills(connectionId, options),
    onSuccess: (data: SyncBillsResponse, { connectionId }) => {
      if (data.status === 'queued') {
        toast.success('Sync started', {
          description: 'Bills are being pulled from your ERP in the background.',
        });
        // Make the poller pick the new "running" row up immediately.
        queryClient.invalidateQueries({ queryKey: ['erp-sync-status', connectionId] });
        queryClient.invalidateQueries({ queryKey: ['erp-sync-logs'] });
        return;
      }
      toast.success(data.message || `Synced ${data.synced_count ?? 0} bills successfully`);
      BILL_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      queryClient.invalidateQueries({ queryKey: ['erp-sync-status', connectionId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync bills: ${error.message}`);
    },
  });
}

/**
 * Latest sync run for a connection. Polls every 3s while a run is in
 * flight, then invalidates the bills queries exactly once when it ends.
 */
export function useSyncStatus(connectionId: string | null | undefined, entity = 'bills') {
  const queryClient = useQueryClient();
  const wasRunning = useRef(false);

  const query = useQuery<SyncStatusResponse>({
    queryKey: ['erp-sync-status', connectionId, entity],
    queryFn: () => erpApi.getSyncStatus(connectionId as string, entity),
    enabled: !!connectionId,
    refetchInterval: (q) => (isSyncRunning(q.state.data?.latest) ? SYNC_POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: false,
  });

  const latest = query.data?.latest ?? null;
  const running = isSyncRunning(latest);

  useEffect(() => {
    if (running) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current || !latest) return;
    wasRunning.current = false;
    BILL_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    if (latest.status === 'failed') {
      toast.error('Sync failed', { description: latest.error_message || 'Unknown error' });
    } else {
      toast.success('Sync complete', {
        description: `${latest.fetched.toLocaleString()} ${latest.entity} fetched`,
      });
    }
  }, [running, latest, queryClient]);

  return { ...query, latest, isSyncRunning: running };
}

/**
 * Sync history (newest first, paginated) for an organization or connection.
 */
export function useSyncLogs(params: SyncLogsParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['erp-sync-logs', params],
    queryFn: () => erpApi.getSyncLogs(params),
    enabled: options.enabled ?? true,
    // Keep the table live while any listed run is still going.
    refetchInterval: (q) =>
      q.state.data?.results.some((log) => isSyncRunning(log)) ? SYNC_POLL_INTERVAL_MS : false,
  });
}

/**
 * Hook to sync contacts from ERP
 */
export function useSyncContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => erpApi.syncContacts(connectionId),
    onSuccess: (data: SyncBillsResponse) => {
      toast.success(data.message || `Synced ${data.synced_count} contacts successfully`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync contacts: ${error.message}`);
    },
  });
}

/**
 * Hook to sync accounts from ERP
 */
export function useSyncAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => erpApi.syncAccounts(connectionId),
    onSuccess: (data: SyncBillsResponse) => {
      toast.success(data.message || `Synced ${data.synced_count} accounts successfully`);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync accounts: ${error.message}`);
    },
  });
}

/**
 * Hook to sync invoices from ERP
 */
export function useSyncInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => erpApi.syncInvoices(connectionId),
    onSuccess: (data: SyncBillsResponse) => {
      toast.success(data.message || `Synced ${data.synced_count} invoices successfully`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      // Invalidate bank transactions queries since we're syncing invoices for reconciliation
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-matched'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions-posted'] });
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync invoices: ${error.message}`);
    },
  });
}
