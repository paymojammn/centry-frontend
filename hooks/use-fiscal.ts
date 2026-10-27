/**
 * Fiscalization React Query hooks (EFRIS / ZRA / DGI e-invoicing).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fiscalApi } from '@/lib/fiscal-api';
import type {
  FiscalCancelPayload,
  FiscalConnectionCreatePayload,
  FiscalConnectionFilters,
  FiscalConnectionUpdatePayload,
  FiscalDocumentFilters,
  FiscalGoodsPayload,
  FiscalIssueInvoicePayload,
  FiscalizePayload,
  FiscalStockPayload,
} from '@/types/fiscal';

export const fiscalKeys = {
  all: ['fiscal'] as const,
  connections: () => [...fiscalKeys.all, 'connections'] as const,
  connectionList: (filters?: FiscalConnectionFilters) => [...fiscalKeys.connections(), 'list', filters] as const,
  credentialSchema: () => [...fiscalKeys.connections(), 'credential-schema'] as const,
  connection: (id: string) => [...fiscalKeys.connections(), 'detail', id] as const,
  documents: () => [...fiscalKeys.all, 'documents'] as const,
  documentList: (filters?: FiscalDocumentFilters) => [...fiscalKeys.documents(), 'list', filters] as const,
  document: (id: string) => [...fiscalKeys.documents(), 'detail', id] as const,
  summary: (filters?: FiscalDocumentFilters) => [...fiscalKeys.documents(), 'summary', filters] as const,
  goods: (connectionId: string, search?: string) => [...fiscalKeys.all, 'goods', connectionId, search] as const,
  informationRequests: (connectionId: string) => [...fiscalKeys.all, 'information', connectionId] as const,
};

// ---- Connections ----------------------------------------------------------

export function useFiscalConnections(organizationId?: string | null, options?: { enabled?: boolean }) {
  const filters: FiscalConnectionFilters = { organization: organizationId || undefined, page_size: 100 };
  return useQuery({
    queryKey: fiscalKeys.connectionList(filters),
    queryFn: () => fiscalApi.getConnections(filters),
    enabled: !!organizationId && (options?.enabled ?? true),
  });
}

/**
 * Server credential schema. Optional: when the endpoint is missing or fails,
 * callers fall back to the static CREDENTIAL_FIELDS (lib/fiscal.ts).
 */
export function useFiscalCredentialSchema(enabled = true) {
  return useQuery({
    queryKey: fiscalKeys.credentialSchema(),
    queryFn: () => fiscalApi.getCredentialSchema(),
    enabled,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });
}

export function useFiscalConnection(id?: string | null) {
  return useQuery({
    queryKey: fiscalKeys.connection(id || ''),
    queryFn: () => fiscalApi.getConnection(id as string),
    enabled: !!id,
  });
}

export function useCreateFiscalConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalConnectionCreatePayload) => fiscalApi.createConnection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalKeys.connections() });
      toast.success('Fiscal connection created');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create fiscal connection'),
  });
}

export function useUpdateFiscalConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FiscalConnectionUpdatePayload }) =>
      fiscalApi.updateConnection(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalKeys.connections() });
      toast.success('Fiscal connection updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update fiscal connection'),
  });
}

export function useDeleteFiscalConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fiscalApi.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalKeys.connections() });
      toast.success('Fiscal connection removed');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove fiscal connection'),
  });
}

export function useUploadFiscalCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, password }: { id: string; file: File; password: string }) =>
      fiscalApi.uploadCertificate(id, file, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalKeys.connections() });
      toast.success('Certificate uploaded');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to upload certificate'),
  });
}

export function useTestFiscalConnection() {
  return useMutation({
    mutationFn: (id: string) => fiscalApi.testConnection(id),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message || 'Connection OK');
      else toast.error(result.message || 'Connection test failed');
    },
    onError: (error: Error) => toast.error(error.message || 'Connection test failed'),
  });
}

// ---- Documents ------------------------------------------------------------

export function useFiscalDocuments(filters?: FiscalDocumentFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fiscalKeys.documentList(filters),
    queryFn: () => fiscalApi.getDocuments(filters),
    enabled: !!filters?.organization && (options?.enabled ?? true),
    placeholderData: (prev) => prev,
  });
}

export function useFiscalDocument(id?: string | null) {
  return useQuery({
    queryKey: fiscalKeys.document(id || ''),
    queryFn: () => fiscalApi.getDocument(id as string),
    enabled: !!id,
  });
}

export function useFiscalDocumentSummary(filters?: FiscalDocumentFilters) {
  return useQuery({
    queryKey: fiscalKeys.summary(filters),
    queryFn: () => fiscalApi.getDocumentSummary(filters),
    enabled: !!filters?.organization,
  });
}

function useDocumentsInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: fiscalKeys.documents() });
}

export function useRetryFiscalDocument() {
  const invalidate = useDocumentsInvalidation();
  return useMutation({
    mutationFn: (id: string) => fiscalApi.retryDocument(id),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.detail || 'Retry queued');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to retry document'),
  });
}

export function useRefreshFiscalDocument() {
  const invalidate = useDocumentsInvalidation();
  return useMutation({
    mutationFn: (id: string) => fiscalApi.refreshDocument(id),
    onSuccess: (doc) => {
      invalidate();
      toast.success(`Status refreshed: ${doc?.status_label || doc?.status || 'updated'}`);
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to refresh status'),
  });
}

export function useCancelFiscalDocument() {
  const invalidate = useDocumentsInvalidation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FiscalCancelPayload }) =>
      fiscalApi.cancelDocument(id, payload),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.detail || 'Cancellation submitted');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to cancel document'),
  });
}

export function useFiscalReceipt() {
  return useMutation({
    mutationFn: (id: string) => fiscalApi.getReceiptHtml(id),
    onError: (error: Error) => toast.error(error.message || 'Failed to load receipt'),
  });
}

export function useFiscalizeInvoice() {
  const invalidate = useDocumentsInvalidation();
  return useMutation({
    mutationFn: (payload: FiscalizePayload) => fiscalApi.fiscalize(payload),
    onSuccess: (res) => {
      invalidate();
      toast.success(res?.detail || 'Fiscalization queued');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to fiscalize invoice'),
  });
}

export function useIssueFiscalInvoice() {
  const invalidate = useDocumentsInvalidation();
  return useMutation({
    mutationFn: (payload: FiscalIssueInvoicePayload) => fiscalApi.issueInvoice(payload),
    onSuccess: () => {
      invalidate();
      toast.success('Invoice queued for fiscalization');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to issue invoice'),
  });
}

// ---- Goods & stock --------------------------------------------------------

export function useFiscalGoods(connectionId?: string | null, search?: string) {
  return useQuery({
    queryKey: fiscalKeys.goods(connectionId || '', search),
    queryFn: () => fiscalApi.getGoods(connectionId as string, search),
    enabled: !!connectionId,
  });
}

export function useRegisterFiscalGoods(connectionId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalGoodsPayload) => fiscalApi.registerGoods(connectionId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...fiscalKeys.all, 'goods', connectionId || ''] });
      toast.success('Goods registered with the authority');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to register goods'),
  });
}

export function useAdjustFiscalStock(connectionId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalStockPayload) => fiscalApi.adjustStock(connectionId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...fiscalKeys.all, 'goods', connectionId || ''] });
      toast.success('Stock adjustment submitted');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to adjust stock'),
  });
}

// ---- Lookups --------------------------------------------------------------

export function useFiscalInformationRequests(connectionId?: string | null) {
  return useQuery({
    queryKey: fiscalKeys.informationRequests(connectionId || ''),
    queryFn: () => fiscalApi.getInformationRequests(connectionId as string),
    enabled: !!connectionId,
  });
}

export function useFiscalInformationLookup() {
  return useMutation({
    mutationFn: ({ connectionId, request, params }: { connectionId: string; request: string; params: Record<string, string> }) =>
      fiscalApi.getInformation(connectionId, request, params),
    onError: (error: Error) => toast.error(error.message || 'Lookup failed'),
  });
}
