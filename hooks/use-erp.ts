/**
 * React Query hooks for ERP Connections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erpApi } from '@/lib/erp-api';
import type { ERPConnection, SyncBillsResponse } from '@/lib/erp-api';
import { toast } from 'sonner';

/**
 * Hook to fetch ERP connections
 */
export function useERPConnections() {
  return useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => erpApi.getERPConnections(),
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
 * Hook to sync bills from ERP
 */
export function useSyncBills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => erpApi.syncBills(connectionId),
    onSuccess: (data: SyncBillsResponse) => {
      toast.success(data.message || `Synced ${data.synced_count} bills successfully`);
      // Invalidate bills query to refetch
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-stats'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync bills: ${error.message}`);
    },
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
