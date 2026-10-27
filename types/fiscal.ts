/**
 * Fiscalization types — EFRIS (UG) / ZRA (ZM) / DGI (BJ) e-invoicing.
 *
 * Shapes mirror the backend fiscal dashboard API (/api/v1/fiscal/), which
 * replaces the legacy taxmoja-api / taxmoja-app tooling.
 */

export type FiscalCountryCode = 'UG' | 'ZM' | 'BJ';

export type FiscalEnvironment = 'test' | 'uat' | 'live';

export type FiscalStatus =
  | 'received'
  | 'sending'
  | 'pending_approval'
  | 'fiscalized'
  | 'rejected'
  | 'error'
  | 'cancelled';

export type FiscalDocumentKind = 'invoice' | 'credit_note';

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FiscalDocumentCounts {
  fiscalized: number;
  error: number;
  pending: number;
}

export interface FiscalConnection {
  id: string;
  organization: string;
  country_code: FiscalCountryCode;
  country_label: string;
  tin: string;
  device_no: string;
  taxpayer_id: string;
  environment: FiscalEnvironment;
  online_mode: boolean;
  legal_name: string;
  business_name: string;
  email: string;
  mobile: string;
  address: string;
  industry_code: string;
  auto_fiscalize: boolean;
  writeback_enabled: boolean;
  is_active: boolean;
  has_certificate: boolean;
  /** Credential keys that are set. Values are never returned. */
  credential_keys: string[];
  document_counts: FiscalDocumentCounts;
  created_at: string;
  updated_at: string;
}

/** Editable connection fields (create + PATCH). */
export interface FiscalConnectionFields {
  country_code: FiscalCountryCode;
  tin: string;
  device_no: string;
  taxpayer_id: string;
  environment: FiscalEnvironment;
  online_mode: boolean;
  legal_name: string;
  business_name: string;
  email: string;
  mobile: string;
  address: string;
  industry_code: string;
  auto_fiscalize: boolean;
  writeback_enabled: boolean;
}

export interface FiscalConnectionCreatePayload extends FiscalConnectionFields {
  organization_id: string;
  credentials?: Record<string, unknown>;
}

export type FiscalConnectionUpdatePayload = Partial<FiscalConnectionFields> & {
  is_active?: boolean;
  /** Merged server-side; omitted keys keep their stored value. */
  credentials?: Record<string, unknown>;
};

export interface FiscalConnectionFilters {
  organization?: string;
  page?: number;
  page_size?: number;
}

export interface FiscalTestResult {
  ok: boolean;
  message: string;
}

export interface FiscalDocument {
  id: string;
  connection: string;
  connection_label: string;
  country_code: FiscalCountryCode;
  environment: FiscalEnvironment;
  kind: FiscalDocumentKind;
  instance_invoice_id: string;
  invoice_number: string;
  buyer_name: string;
  currency: string;
  total_amount: string;
  source_system: string;
  source_invoice_type: string;
  source_invoice_id: string;
  status: FiscalStatus;
  status_label: string;
  fdn: string;
  approval_reference: string;
  verification_code: string;
  anti_fake_code: string;
  qr_code: string;
  upload_code: string;
  upload_desc: string;
  error_message: string;
  written_back_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocumentDetail extends FiscalDocument {
  request_data: unknown;
  response_data: unknown;
  canonical_data: unknown;
}

export interface FiscalDocumentFilters {
  organization?: string;
  status?: FiscalStatus | 'all';
  country_code?: FiscalCountryCode | 'all';
  connection?: string;
  source_system?: string;
  kind?: FiscalDocumentKind | 'all';
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface FiscalDocumentSummary {
  total: number;
  fiscalized: number;
  pending_approval: number;
  error: number;
  rejected: number;
  cancelled: number;
}

export interface FiscalQueuedResponse {
  detail: string;
  task_id?: string;
}

export interface FiscalCancelPayload {
  reason: string;
  reason_code: string;
}

export interface FiscalizePayload {
  connection_id: string;
  source_system: string;
  source_invoice_type: string;
  source_invoice_id: string;
}

/** POST invoices/ — a native canonical invoice issued from the UI. */
export interface FiscalIssueInvoicePayload {
  connection_id: string;
  [key: string]: unknown;
}

export interface FiscalIssueInvoiceResponse {
  document_id: string;
  task_id?: string;
}

export interface FiscalGoodInput {
  good_code: string;
  name: string;
  measure_unit: string;
  unit_price: string;
  currency: string;
  commodity_category: string;
  have_excise_tax: boolean;
  stock_prewarning: string;
}

export interface FiscalGoodsPayload {
  items: FiscalGoodInput[];
}

/** Goods inquiry rows are the authority's own shape; rendered generically. */
export type FiscalGoodRow = Record<string, unknown>;

export type FiscalStockOperation = 'increase' | 'decrease';

export interface FiscalStockItem {
  good_code: string;
  quantity: string;
  unit_price: string;
}

export interface FiscalStockPayload {
  operation: FiscalStockOperation;
  items: FiscalStockItem[];
  supplier_name?: string;
  supplier_tin?: string;
  adjust_type?: string;
  remarks?: string;
}

export interface FiscalInformationParam {
  name: string;
  label: string;
  required?: boolean;
}

export interface FiscalInformationRequest {
  key: string;
  label: string;
  params: FiscalInformationParam[];
}
