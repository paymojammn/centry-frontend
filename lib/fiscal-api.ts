/**
 * Fiscalization API client — /api/v1/fiscal/ (JWT, org-scoped).
 *
 * Every endpoint of the fiscal dashboard contract. Types live in
 * types/fiscal.ts; pure helpers in lib/fiscal.ts; hooks in hooks/use-fiscal.ts.
 */

import api, { apiRequest } from './api';
import { cleanParams, normalizeInformationRequests, toPage, type CredentialSchema } from './fiscal';
import type {
  FiscalCancelPayload,
  FiscalCancelResponse,
  FiscalConnection,
  FiscalConnectionCreatePayload,
  FiscalConnectionFilters,
  FiscalConnectionUpdatePayload,
  FiscalDocument,
  FiscalDocumentDetail,
  FiscalDocumentFilters,
  FiscalDocumentSummary,
  FiscalGoodsInquiry,
  FiscalGoodsPayload,
  FiscalInformationRequest,
  FiscalInformationResponse,
  FiscalIssueInvoicePayload,
  FiscalIssueInvoiceResponse,
  FiscalItemsResponse,
  FiscalizePayload,
  FiscalQueuedResponse,
  FiscalStockPayload,
  FiscalTestResult,
  Paginated,
} from '@/types/fiscal';

const BASE = '/api/v1/fiscal';

type PageLike<T> = Paginated<T> | T[];

/** Endpoints that may answer 204 / non-JSON: read the body as a blob and drop it. */
async function requestNoContent(endpoint: string, method: 'DELETE'): Promise<void> {
  await apiRequest<Blob>(endpoint, { method, responseType: 'blob' });
}

export const fiscalApi = {
  // ---- Connections -------------------------------------------------------
  async getConnections(filters?: FiscalConnectionFilters): Promise<Paginated<FiscalConnection>> {
    const res = await api.get<PageLike<FiscalConnection>>(`${BASE}/connections/`, {
      params: cleanParams(filters),
    });
    return toPage(res);
  },

  /** {country: {required, optional, secret}} credential keys per handler. */
  getCredentialSchema(): Promise<CredentialSchema> {
    return api.get<CredentialSchema>(`${BASE}/connections/credential-schema/`);
  },

  getConnection(id: string): Promise<FiscalConnection> {
    return api.get<FiscalConnection>(`${BASE}/connections/${id}/`);
  },

  createConnection(payload: FiscalConnectionCreatePayload): Promise<FiscalConnection> {
    return api.post<FiscalConnection>(`${BASE}/connections/`, payload);
  },

  updateConnection(id: string, payload: FiscalConnectionUpdatePayload): Promise<FiscalConnection> {
    return api.patch<FiscalConnection>(`${BASE}/connections/${id}/`, payload);
  },

  /** Deactivates when the connection has documents, deletes otherwise. */
  deleteConnection(id: string): Promise<void> {
    return requestNoContent(`${BASE}/connections/${id}/`, 'DELETE');
  },

  uploadCertificate(id: string, file: File, password: string): Promise<FiscalConnection> {
    const form = new FormData();
    form.append('file', file);
    form.append('password', password);
    return api.post<FiscalConnection>(`${BASE}/connections/${id}/certificate/`, form);
  },

  testConnection(id: string): Promise<FiscalTestResult> {
    return api.post<FiscalTestResult>(`${BASE}/connections/${id}/test/`, {});
  },

  // ---- Documents ---------------------------------------------------------
  async getDocuments(filters?: FiscalDocumentFilters): Promise<Paginated<FiscalDocument>> {
    const res = await api.get<PageLike<FiscalDocument>>(`${BASE}/documents/`, {
      params: cleanParams(filters),
    });
    return toPage(res);
  },

  getDocument(id: string): Promise<FiscalDocumentDetail> {
    return api.get<FiscalDocumentDetail>(`${BASE}/documents/${id}/`);
  },

  getDocumentSummary(filters?: FiscalDocumentFilters): Promise<FiscalDocumentSummary> {
    // Summary takes the list filters but is not paginated.
    const params = cleanParams({ ...filters, page: undefined, page_size: undefined });
    return api.get<FiscalDocumentSummary>(`${BASE}/documents/summary/`, { params });
  },

  retryDocument(id: string): Promise<FiscalQueuedResponse> {
    return api.post<FiscalQueuedResponse>(`${BASE}/documents/${id}/retry/`, {});
  },

  refreshDocument(id: string): Promise<FiscalDocument> {
    return api.post<FiscalDocument>(`${BASE}/documents/${id}/refresh/`, {});
  },

  /** 202: queues a credit note / cancellation, which is a NEW document. */
  cancelDocument(id: string, payload: FiscalCancelPayload): Promise<FiscalCancelResponse> {
    return api.post<FiscalCancelResponse>(`${BASE}/documents/${id}/cancel/`, payload);
  },

  /** Printable HTML receipt. Needs the auth header, so it is fetched, not linked. */
  async getReceiptHtml(id: string): Promise<string> {
    const blob = await apiRequest<Blob>(`${BASE}/documents/${id}/receipt/`, {
      method: 'GET',
      responseType: 'blob',
    });
    return blob.text();
  },

  fiscalize(payload: FiscalizePayload): Promise<FiscalQueuedResponse> {
    // No trailing slash: the backend route is `fiscal/fiscalize`.
    return api.post<FiscalQueuedResponse>(`${BASE}/fiscalize`, payload);
  },

  issueInvoice(payload: FiscalIssueInvoicePayload): Promise<FiscalIssueInvoiceResponse> {
    return api.post<FiscalIssueInvoiceResponse>(`${BASE}/invoices/`, payload);
  },

  // ---- Goods & stock -----------------------------------------------------
  /** EFRIS T127 goods inquiry: `{records, page}`. */
  async getGoods(
    connectionId: string,
    params?: { search?: string; page?: number; page_size?: number },
  ): Promise<FiscalGoodsInquiry> {
    const res = await api.get<Partial<FiscalGoodsInquiry>>(`${BASE}/connections/${connectionId}/goods/`, {
      params: cleanParams(params),
    });
    return { records: Array.isArray(res?.records) ? res.records : [], page: res?.page ?? {} };
  },

  registerGoods(connectionId: string, payload: FiscalGoodsPayload): Promise<FiscalItemsResponse> {
    return api.post<FiscalItemsResponse>(`${BASE}/connections/${connectionId}/goods/`, payload);
  },

  adjustStock(connectionId: string, payload: FiscalStockPayload): Promise<FiscalItemsResponse> {
    return api.post<FiscalItemsResponse>(`${BASE}/connections/${connectionId}/stock/`, payload);
  },

  // ---- Authority lookups -------------------------------------------------
  async getInformationRequests(connectionId: string): Promise<FiscalInformationRequest[]> {
    const res = await api.get<unknown>(`${BASE}/connections/${connectionId}/information/`);
    return normalizeInformationRequests(res);
  },

  getInformation(
    connectionId: string,
    request: string,
    params: Record<string, string>,
  ): Promise<FiscalInformationResponse> {
    return api.get<FiscalInformationResponse>(
      `${BASE}/connections/${connectionId}/information/${encodeURIComponent(request)}/`,
      { params: cleanParams(params) },
    );
  },
};

export default fiscalApi;
