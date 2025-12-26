/**
 * Banking Integration API Hooks
 * 
 * React Query hooks for banking integrations API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

// Types
export interface BankProvider {
  id: number;
  name: string;
  code: string;
  country: string;
  supported_formats: string[];
  is_active: boolean;
}

export interface ERPConnection {
  id: string;
  name: string;
  provider: {
    code: string;
    name: string;
  };
  is_active: boolean;
  organization: {
    id: string;
    name: string;
  };
}

export interface BankFileImport {
  id: number;
  bank_provider: {
    id: number;
    name: string;
    code: string;
  };
  original_filename: string;
  file_hash: string;
  status: string;
  transactions_count: number;
  transactions_synced: number;
  imported_at: string;
  synced_at?: string;
}

export interface BankTransaction {
  id: number;
  file_import: number;
  transaction_date: string;
  description: string;
  reference: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  is_approved: boolean;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';
  synced_at?: string;
}

export interface ImportStats {
  total_imports: number;
  total_transactions: number;
  synced_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  sync_percentage: number;
  by_status: Array<{ status: string; count: number }>;
  by_provider: Array<{
    bank_provider__name: string;
    bank_provider__code: string;
    count: number;
    total_txs: number;
  }>;
  recent_imports: BankFileImport[];
}

export interface ExportStats {
  total_exports: number;
  total_payments: number;
  total_amount: string;
  pending_exports: number;
  uploaded_exports: number;
  processed_exports: number;
  failed_exports: number;
  by_status: Array<{ status: string; count: number; total_payments: number }>;
  by_bank: Array<{
    bank_account__account_name: string;
    bank_account__bank_provider__name: string;
    count: number;
    total_payments: number;
    total_amount: string;
  }>;
  recent_exports: BankPaymentExport[];
}

// API Hooks

/**
 * Get bank providers
 */
export function useBankProviders() {
  return useQuery<{ results: BankProvider[]; count?: number }>({
    queryKey: ['bankProviders'],
    queryFn: async () => {
      const response = await get<BankProvider[] | { results: BankProvider[] }>('/api/v1/banking/providers/');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        return { results: response };
      }
      return response;
    },
  });
}

/**
 * Get ERP connections
 */
export function useERPConnections(provider?: string) {
  return useQuery<{ connections: ERPConnection[]; count: number }>({
    queryKey: ['erpConnections', provider],
    queryFn: () => {
      const params = provider ? `?provider=${provider}` : '';
      return get(`/api/v1/banking/imports/erp-connections/${params}`);
    },
  });
}

/**
 * Get bank file imports
 */
export function useBankImports(filters?: {
  status?: string;
  bank_provider?: number;
  organizationId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.bank_provider) params.append('bank_provider', filters.bank_provider.toString());
  if (filters?.organizationId) params.append('organization', filters.organizationId);

  const queryString = params.toString();

  return useQuery<{ results: BankFileImport[] }>({
    queryKey: ['bankImports', queryString],
    queryFn: () => get(`/api/v1/banking/imports/${queryString ? `?${queryString}` : ''}`),
    enabled: !!filters?.organizationId,
  });
}

/**
 * Get import statistics
 */
export function useImportStats(filters?: {
  date_from?: string;
  date_to?: string;
  organizationId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.organizationId) params.append('organization', filters.organizationId);

  const queryString = params.toString();

  return useQuery<ImportStats>({
    queryKey: ['importStats', queryString],
    queryFn: () => get(`/api/v1/banking/imports/stats/${queryString ? `?${queryString}` : ''}`),
    enabled: !!filters?.organizationId,
  });
}

/**
 * Get export statistics
 */
export function useExportStats(filters?: {
  date_from?: string;
  date_to?: string;
  organizationId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.organizationId) params.append('organization', filters.organizationId);

  const queryString = params.toString();

  return useQuery<ExportStats>({
    queryKey: ['exportStats', queryString],
    queryFn: () => get(`/api/v1/banking/exports/stats/${queryString ? `?${queryString}` : ''}`),
    enabled: !!filters?.organizationId,
  });
}

/**
 * Get bank transactions
 */
export function useBankTransactions(filters?: {
  file_import?: number;
  transaction_type?: string;
  is_synced?: boolean;
  date_from?: string;
  date_to?: string;
  organizationId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.file_import) params.append('file_import', filters.file_import.toString());
  if (filters?.transaction_type) params.append('transaction_type', filters.transaction_type);
  if (filters?.is_synced !== undefined) params.append('is_synced', filters.is_synced.toString());
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  if (filters?.organizationId) params.append('organization', filters.organizationId);

  const queryString = params.toString();

  return useQuery<{ results: BankTransaction[] }>({
    queryKey: ['bankTransactions', queryString],
    queryFn: () => get(`/api/v1/banking/transactions/${queryString ? `?${queryString}` : ''}`),
  });
}

/**
 * Get bank accounts for organization
 * Only returns active accounts by default
 */
export function useBankAccounts(organizationId?: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['bankAccounts', organizationId, includeInactive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organization', organizationId);
      if (!includeInactive) params.append('is_active', 'true');
      return get(`/api/v1/banking/accounts/?${params.toString()}`);
    },
    enabled: !!organizationId,
  });
}

/**
 * Upload bank file
 */
export function useUploadBankFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file: File;
      bank_provider?: number;
      bank_account?: number;
      erp_connection: string;
    }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.bank_account) {
        formData.append('bank_account', data.bank_account.toString());
      } else if (data.bank_provider) {
        formData.append('bank_provider', data.bank_provider.toString());
      }
      formData.append('erp_connection', data.erp_connection);

      // Debug: Log FormData contents
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      return post('/api/v1/banking/imports/', formData, {
        headers: {
          // Let browser set Content-Type for multipart/form-data
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImports'] });
      queryClient.invalidateQueries({ queryKey: ['importStats'] });
    },
  });
}

/**
 * Sync to Xero
 */
export function useSyncToXero() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      import_id: number;
      bank_account_code?: string;
      auto_approve?: boolean;
    }) => {
      return post(`/api/v1/banking/imports/${data.import_id}/sync/`, {
        bank_account_code: data.bank_account_code,
        auto_approve: data.auto_approve,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImports'] });
      queryClient.invalidateQueries({ queryKey: ['importStats'] });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
    },
  });
}

/**
 * Sync from Xero
 */
export function useSyncFromXero() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      connection_id: string;
      if_modified_since?: string;
      status_filter?: string;
    }) => {
      return post('/api/v1/banking/imports/sync-from-xero/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['importStats'] });
    },
  });
}

/**
 * Hook to auto-reconcile transactions using AI matching
 */
export function useAutoReconcile() {
  return useMutation<
    { status: string; task_id: string; message: string },
    Error,
    {
      organization: string;
      erp_connection: string;
      min_confidence?: number;
      auto_apply?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return post('/api/v1/banking/transactions/auto_reconcile/', data);
    },
  });
}

export function useAutoReconcileStatus(taskId?: string) {
  const queryClient = useQueryClient();

  return useQuery<{
    task_id: string;
    status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
    message: string;
    result?: {
      success: boolean;
      matched_count: number;
      suggested_count: number;
      skipped_count: number;
      total_processed: number;
      matches: any[];
      errors: any[];
    };
    error?: string;
  }>({
    queryKey: ['auto-reconcile-status', taskId],
    queryFn: () => get(`/api/v1/banking/transactions/auto_reconcile_status/${taskId}/`),
    enabled: !!taskId,
    refetchInterval: (data) => {
      // Stop polling if task is complete or failed
      if (data?.status === 'SUCCESS' || data?.status === 'FAILURE') {
        // Invalidate transaction queries when reconciliation completes
        queryClient.invalidateQueries({ queryKey: ['bank-transactions-unmatched'] });
        queryClient.invalidateQueries({ queryKey: ['bank-transactions-matched'] });
        queryClient.invalidateQueries({ queryKey: ['bank-transactions-suggested'] });
        queryClient.invalidateQueries({ queryKey: ['bank-reconciliation-stats'] });
        queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
        return false;
      }
      // Poll every 2 seconds while running
      return 2000;
    },
  });
}

// ===========================================
// SFTP Types
// ===========================================

export interface SFTPRemoteFile {
  name: string;
  size: number;
  mtime: string;
  is_dir: boolean;
}

export interface SFTPCredential {
  id: number;
  bank_account: {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
    currency: string;
  };
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  has_password: boolean;
  has_private_key: boolean;
  upload_path: string;
  download_path: string;
  timeout: number;
  is_active: boolean;
  auto_upload_enabled: boolean;
  last_connection_test: string | null;
  last_connection_error: string | null;
  connection_status: 'untested' | 'connected' | 'error';
  created_at: string;
  updated_at: string;
}

export interface SFTPTransferLog {
  id: number;
  sftp_credential: number;
  bank_account_name: string;
  direction: 'upload' | 'download';
  local_file_path: string;
  remote_file_path: string;
  file_size: number;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  error_message: string | null;
  error_details: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  initiated_by: number | null;
  initiated_by_name: string | null;
  payment_instruction_id: number | null;
  created_at: string;
}

export interface SFTPTaskStatus {
  task_id: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';
  result?: {
    success: boolean;
    remote_path?: string;
    error?: string;
    files_downloaded?: number;
    files_imported?: number;
  };
}

export interface BankPaymentExport {
  id: number;
  bank_account: {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
  };
  format: string;
  file_name: string;
  file_path: string;
  file_size: number;
  total_amount: string;
  currency: string;
  payment_count: number;
  status: 'pending' | 'generated' | 'uploaded' | 'processed' | 'failed';
  sftp_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===========================================
// SFTP API Hooks
// ===========================================

/**
 * List files available on the bank's SFTP server
 */
export function useSFTPRemoteFiles(bankAccountId?: number, sftpCredentialId?: number) {
  const params = sftpCredentialId ? `?sftp_credential_id=${sftpCredentialId}` : '';
  return useQuery<{ success: boolean; files: SFTPRemoteFile[]; download_path: string }>({
    queryKey: ['sftp-remote-files', bankAccountId, sftpCredentialId],
    queryFn: () => get(`/api/v1/banking/sftp/files/${bankAccountId}/${params}`),
    enabled: !!bankAccountId,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get SFTP credentials for a bank account
 */
export function useSFTPCredentials(bankAccountId?: number) {
  return useQuery<{ results: SFTPCredential[]; count: number }>({
    queryKey: ['sftp-credentials', bankAccountId],
    queryFn: () => {
      const params = bankAccountId ? `?bank_account=${bankAccountId}` : '';
      return get(`/api/v1/banking/sftp-credentials/${params}`);
    },
    enabled: !!bankAccountId,
  });
}

/**
 * Get SFTP transfer logs
 */
export function useSFTPTransferLogs(filters?: {
  bankAccountId?: number;
  direction?: 'upload' | 'download';
  status?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.bankAccountId) params.append('sftp_credential__bank_account', filters.bankAccountId.toString());
  if (filters?.direction) params.append('direction', filters.direction);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();

  return useQuery<{ results: SFTPTransferLog[]; count: number }>({
    queryKey: ['sftp-transfer-logs', queryString],
    queryFn: () => get(`/api/v1/banking/sftp-transfers/${queryString ? `?${queryString}` : ''}`),
  });
}

/**
 * Get SFTP task status
 */
export function useSFTPTaskStatus(taskId?: string) {
  return useQuery<SFTPTaskStatus>({
    queryKey: ['sftp-task', taskId],
    queryFn: () => get(`/api/v1/banking/sftp/task/${taskId}/`),
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Keep polling while task is pending or in progress
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'STARTED' || status === 'RETRY') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling when complete
    },
  });
}

/**
 * Download statements from SFTP server
 */
export function useSFTPDownloadStatements() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; task_id: string },
    Error,
    {
      bank_account_id: number;
      sftp_credential_id?: number;
      file_patterns?: string[];
      since_hours?: number;
      auto_import?: boolean;
      move_processed?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return post('/api/v1/banking/sftp/download/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-remote-files'] });
      queryClient.invalidateQueries({ queryKey: ['sftp-transfer-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bankImports'] });
    },
  });
}

/**
 * Download a single file from SFTP server
 */
export function useSFTPDownloadSingleFile() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; task_id: string; filename: string },
    Error,
    {
      bank_account_id: number;
      sftp_credential_id?: number;
      filename: string;
      auto_import?: boolean;
      move_to_processed?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return post('/api/v1/banking/sftp/download-file/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-remote-files'] });
      queryClient.invalidateQueries({ queryKey: ['sftp-transfer-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bankImports'] });
    },
  });
}

/**
 * Upload a file to SFTP server
 */
export function useSFTPUpload() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; task_id?: string; remote_path?: string; async: boolean },
    Error,
    {
      bank_account_id: number;
      sftp_credential_id?: number;
      file_path: string;
      remote_filename?: string;
      payment_instruction_id?: number;
      export_id?: number;
      async_upload?: boolean;
    }
  >({
    mutationFn: async (data) => {
      return post('/api/v1/banking/sftp/upload/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sftp-transfer-logs'] });
      queryClient.invalidateQueries({ queryKey: ['bank-payment-exports'] });
    },
  });
}

/**
 * Get bank payment exports (files ready for SFTP upload)
 */
export function useBankPaymentExports(filters?: {
  bankAccountId?: number;
  status?: string;
  organizationId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.bankAccountId) params.append('bank_account', filters.bankAccountId.toString());
  if (filters?.status) params.append('status', filters.status);
  if (filters?.organizationId) params.append('organization', filters.organizationId);

  const queryString = params.toString();

  return useQuery<{ results: BankPaymentExport[]; count: number }>({
    queryKey: ['bank-payment-exports', queryString],
    queryFn: () => get(`/api/v1/banking/exports/${queryString ? `?${queryString}` : ''}`),
    enabled: !!filters?.organizationId,
  });
}

// ===========================================
// Local Export Files Types & Hooks
// ===========================================

export interface LocalExportFile {
  filename: string;
  path: string;
  absolute_path: string;
  size: number;
  size_display: string;
  modified: string | null;
  created_at: string | null;
  file_type: string;
  batch_id: string | null;
  format: string;
  sftp_uploaded: boolean;
  metadata: Record<string, unknown>;
}

export interface LocalExportFilesResponse {
  success: boolean;
  files: LocalExportFile[];
  export_path: string | null;
  total_count: number;
  bank_account: {
    id: number;
    account_name: string;
    account_number: string;
  };
}

/**
 * Get local export files for a bank account
 * These are files stored locally that can be uploaded to SFTP
 */
export function useLocalExportFiles(bankAccountId?: number, options?: {
  file_type?: string;
  batch_id?: string;
}) {
  const params = new URLSearchParams();
  if (options?.file_type) params.append('file_type', options.file_type);
  if (options?.batch_id) params.append('batch_id', options.batch_id);

  const queryString = params.toString();

  return useQuery<LocalExportFilesResponse>({
    queryKey: ['local-export-files', bankAccountId, queryString],
    queryFn: () => get(`/api/v1/banking/exports/files/${bankAccountId}/${queryString ? `?${queryString}` : ''}`),
    enabled: !!bankAccountId,
    refetchOnWindowFocus: false,
  });
}

// ===========================================
// Export Payment Types & Hooks
// ===========================================

export interface ExportPayment {
  id: number;
  reference: string;
  amount: string;
  currency: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_bank: string;
  payment_date: string;
  status: string;
  description?: string;
}

/**
 * Get payments for a specific export file
 */
export function useExportPayments(exportId?: number) {
  return useQuery<{ results: ExportPayment[]; count: number }>({
    queryKey: ['export-payments', exportId],
    queryFn: () => get(`/api/v1/banking/exports/${exportId}/payments/`),
    enabled: !!exportId,
  });
}
