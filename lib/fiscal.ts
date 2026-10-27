/**
 * Fiscalization pure helpers: status mapping, per-country credential fields,
 * query building and ERP-invoice source resolution. Unit-tested in
 * lib/__tests__/fiscal.test.ts; the API client is lib/fiscal-api.ts.
 */

import type {
  FiscalCountryCode,
  FiscalDocument,
  FiscalEnvironment,
  FiscalInformationParam,
  FiscalInformationRequest,
  FiscalStatus,
} from '@/types/fiscal';

// ---------------------------------------------------------------------------
// Countries / environments
// ---------------------------------------------------------------------------

export const FISCAL_COUNTRIES: { code: FiscalCountryCode; label: string; authority: string }[] = [
  { code: 'UG', label: 'Uganda', authority: 'URA EFRIS' },
  { code: 'ZM', label: 'Zambia', authority: 'ZRA' },
  { code: 'BJ', label: 'Benin', authority: 'DGI' },
];

export function countryLabel(code: string): string {
  const c = FISCAL_COUNTRIES.find((x) => x.code === code);
  return c ? `${c.label} (${c.authority})` : code;
}

export const FISCAL_ENVIRONMENTS: { value: FiscalEnvironment; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'uat', label: 'UAT' },
  { value: 'live', label: 'Live' },
];

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const FISCAL_STATUSES: { value: FiscalStatus; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'sending', label: 'Sending' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'fiscalized', label: 'Fiscalized' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'error', label: 'Error' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Map a fiscal status onto the app-wide StatusBadge vocabulary
 * (lib/theme.ts getStatusColor) plus a display label.
 */
export function fiscalStatusBadge(status: string, label?: string): { badge: string; label: string } {
  const known = FISCAL_STATUSES.find((s) => s.value === status);
  const display = label || known?.label || status;
  switch (status) {
    case 'fiscalized':
      return { badge: 'success', label: display };
    case 'pending_approval':
      return { badge: 'pending_approval', label: display };
    case 'received':
    case 'sending':
      return { badge: 'processing', label: display };
    case 'rejected':
    case 'error':
      return { badge: 'failed', label: display };
    case 'cancelled':
      return { badge: 'repeating', label: display };
    default:
      return { badge: 'draft', label: display };
  }
}

export function canRetry(doc: Pick<FiscalDocument, 'status'>): boolean {
  return doc.status === 'error' || doc.status === 'rejected';
}

export function canRefresh(doc: Pick<FiscalDocument, 'status' | 'fdn' | 'approval_reference'>): boolean {
  if (doc.status === 'cancelled') return false;
  return Boolean(doc.fdn || doc.approval_reference) || doc.status === 'sending' || doc.status === 'pending_approval';
}

export function canCancel(doc: Pick<FiscalDocument, 'status' | 'kind'>): boolean {
  return doc.status === 'fiscalized' && doc.kind === 'invoice';
}

/** EFRIS credit-note reason codes (T110 reasonCode). */
export const UG_CANCEL_REASON_CODES: { value: string; label: string }[] = [
  { value: '101', label: 'Return of products due to expiry or damage' },
  { value: '102', label: 'Cancellation of the purchase' },
  { value: '103', label: 'Invoice amount wrongly stated (price, tax or discount)' },
  { value: '104', label: 'Partial or complete waive-off after the invoice was issued' },
  { value: '105', label: 'Others' },
];

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export type CredentialInput = 'text' | 'textarea' | 'json' | 'select';

export interface CredentialField {
  key: string;
  label: string;
  /** Rendered masked. All credentials are write-only regardless. */
  secret?: boolean;
  /** Required when creating a connection. */
  required?: boolean;
  /** text (default), textarea (multi-line keys), json (object maps), select. */
  input?: CredentialInput;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

/**
 * Static credential fields per country, the one place the dashboard defines
 * them. They mirror the backend handlers' CREDENTIAL_KEYS
 * (fiscal/services/handlers/<CC>/handler.py). When the API serves
 * connections/credential-schema/, `resolveCredentialFields` lets that schema
 * decide which keys exist, which are required and which are secret, and this
 * table only supplies labels and input hints. Keep the two in step: the API
 * rejects unknown keys.
 */
export const CREDENTIAL_FIELDS: Record<FiscalCountryCode, CredentialField[]> = {
  UG: [
    { key: 'app_id', label: 'App ID', required: true, placeholder: 'AP04' },
    { key: 'efris_version', label: 'EFRIS version', required: true, placeholder: '1.1.20191201' },
    { key: 'efris_username', label: 'EFRIS username', required: true },
    { key: 'efris_url', label: 'EFRIS URL (offline enabler)', required: true, placeholder: 'http://…' },
    { key: 'efris_url_online', label: 'EFRIS URL (online)', required: true, placeholder: 'https://…' },
    { key: 'efris_device_no', label: 'EFRIS device number', help: 'Defaults to the connection device number.' },
    { key: 'private_key_password', label: 'Private key password', secret: true },
    {
      key: 'price_tax_mode',
      label: 'Price tax mode',
      input: 'select',
      options: [
        { value: 'inclusive', label: 'Tax inclusive' },
        { value: 'exclusive', label: 'Tax exclusive' },
      ],
    },
    {
      key: 'payment_mode',
      label: 'Default payment mode',
      input: 'select',
      options: [
        { value: '101', label: '101 · Credit' },
        { value: '102', label: '102 · Cash' },
        { value: '103', label: '103 · Cheque' },
        { value: '104', label: '104 · Demand draft' },
        { value: '105', label: '105 · Mobile money' },
        { value: '106', label: '106 · Visa / Mastercard' },
        { value: '107', label: '107 · EFT' },
        { value: '108', label: '108 · POS' },
        { value: '109', label: '109 · RTGS' },
        { value: '110', label: '110 · Swift transfer' },
      ],
    },
  ],
  ZM: [
    { key: 'zra_url', label: 'ZRA API URL', required: true, placeholder: 'https://…' },
    { key: 'zra_terminal_id', label: 'Terminal ID', required: true },
    { key: 'zra_private_key', label: 'Private key', required: true, secret: true, input: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----' },
    { key: 'zra_signed_rsa_key', label: 'Signed RSA key', required: true, secret: true, input: 'textarea' },
    { key: 'software_version', label: 'Software version', required: true },
    { key: 'zra_tax_pin', label: 'Tax PIN', help: 'Defaults to the connection TIN.' },
    { key: 'zra_tax_acc_name', label: 'Tax account name' },
    { key: 'zra_serial_number', label: 'Serial number' },
    { key: 'zra_registration_code', label: 'Registration code' },
    { key: 'zra_host_header', label: 'Host header' },
    { key: 'zra_des_key', label: 'DES key', secret: true },
    { key: 'zra_tax_category_map', label: 'Tax category map', input: 'json', placeholder: '{"VAT16": "A"}' },
    { key: 'zra_default_tax_category', label: 'Default tax category' },
  ],
  BJ: [
    { key: 'sfe_url', label: 'e-MECeF API URL', required: true, placeholder: 'https://…' },
    { key: 'sfe_token', label: 'e-MECeF API token', required: true, secret: true },
    { key: 'ifu', label: 'IFU', help: 'Defaults to the connection TIN.' },
    { key: 'sfe_tax_group_map', label: 'Tax group map', input: 'json', placeholder: '{"VAT18": "B"}' },
    { key: 'sfe_default_tax_group', label: 'Default tax group' },
  ],
};

/** GET connections/credential-schema/: {country: {required, optional, secret}}. */
export type CredentialSchema = Record<string, { required?: string[]; optional?: string[]; secret?: string[] }>;

/**
 * Credential fields for `country`. With a server schema, the schema's keys
 * (required first, then optional) and its required/secret flags win; the
 * static table supplies labels and input hints, and unknown keys get a plain
 * text (or masked) input. Without one, the static table is used as is.
 */
export function resolveCredentialFields(country: string, schema?: CredentialSchema | null): CredentialField[] {
  const known = CREDENTIAL_FIELDS[country as FiscalCountryCode] ?? [];
  const entry = schema?.[country];
  if (!entry || (!entry.required?.length && !entry.optional?.length)) return known;
  const required = entry.required ?? [];
  const secret = new Set(entry.secret ?? []);
  const keys = [...required, ...(entry.optional ?? []).filter((k) => !required.includes(k))];
  return keys.map((key) => {
    const base = known.find((f) => f.key === key);
    return {
      ...(base ?? { key, label: humanize(key) }),
      required: required.includes(key),
      secret: secret.has(key),
    };
  });
}

export function credentialFieldsFor(country: string, schema?: CredentialSchema | null): CredentialField[] {
  return resolveCredentialFields(country, schema);
}

/** A JSON credential must be an object; returns an error message or null. */
export function jsonCredentialError(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const parsed: unknown = JSON.parse(v);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? null : 'Enter a JSON object.';
  } catch {
    return 'Invalid JSON.';
  }
}

/**
 * Credentials to send. Blank means "keep the stored value", so blanks are
 * dropped; returns undefined when nothing was entered so a PATCH leaves the
 * stored credentials untouched. Only keys defined for `country` are sent.
 * JSON fields are sent parsed; multi-line keys keep their line breaks.
 */
export function buildCredentialsPayload(
  country: string,
  values: Record<string, string>,
  schema?: CredentialSchema | null,
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const field of credentialFieldsFor(country, schema)) {
    const raw = values[field.key] ?? '';
    const v = raw.trim();
    if (!v) continue;
    if (field.input === 'json') out[field.key] = JSON.parse(v) as unknown;
    else if (field.input === 'textarea') out[field.key] = raw.replace(/\r\n/g, '\n').trim();
    else out[field.key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Required credential keys that are neither stored (`setKeys`) nor entered.
 */
export function missingRequiredCredentials(
  country: string,
  values: Record<string, string>,
  setKeys: string[] = [],
  schema?: CredentialSchema | null,
): string[] {
  return credentialFieldsFor(country, schema)
    .filter((f) => f.required && !setKeys.includes(f.key) && !(values[f.key] ?? '').trim())
    .map((f) => f.key);
}

/** Goods registration and stock adjustment exist for URA EFRIS only. */
export function supportsGoodsAndStock(country: string): boolean {
  return country === 'UG';
}

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

/** Drop empty and "all" values so the API only sees real filters. */
export function cleanParams(
  filters: object | undefined,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!filters) return out;
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t || t === 'all') continue;
      out[k] = t;
    } else if (typeof v === 'number') {
      out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  return out;
}

export function totalPages(count: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

/** Accept a DRF page envelope or a bare array. */
export function toPage<T>(
  res: { count?: number; next?: string | null; previous?: string | null; results?: T[] } | T[] | null | undefined,
): { count: number; next: string | null; previous: string | null; results: T[] } {
  if (Array.isArray(res)) return { count: res.length, next: null, previous: null, results: res };
  const results = res?.results ?? [];
  return {
    count: res?.count ?? results.length,
    next: res?.next ?? null,
    previous: res?.previous ?? null,
    results,
  };
}

/** Information-request params may arrive as strings or objects. */
export function normalizeInformationRequests(raw: unknown): FiscalInformationRequest[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { results?: unknown[] })?.results)
      ? (raw as { results: unknown[] }).results
      : [];
  return list
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => {
      const key = String(r.key ?? '');
      const params: FiscalInformationParam[] = (Array.isArray(r.params) ? r.params : []).map((p: unknown) => {
        if (typeof p === 'string') return { name: p, label: humanize(p) };
        const o = (p ?? {}) as Record<string, unknown>;
        const name = String(o.name ?? o.key ?? '');
        return { name, label: String(o.label ?? humanize(name)), required: Boolean(o.required) };
      });
      return { key, label: String(r.label ?? humanize(key)), params };
    })
    .filter((r) => r.key);
}

export function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Shape arbitrary authority output for display: an array of rows becomes a
 * table, a plain object becomes key/value rows, anything else is shown raw.
 */
export function tabulate(
  data: unknown,
): { kind: 'table'; columns: string[]; rows: Record<string, unknown>[] } | { kind: 'pairs'; rows: [string, unknown][] } | { kind: 'raw' } {
  const unwrap =
    data && typeof data === 'object' && !Array.isArray(data) && Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: unknown[] }).results
      : data;
  if (Array.isArray(unwrap)) {
    const rows = unwrap.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r));
    if (rows.length === 0 || rows.length !== unwrap.length) return { kind: 'raw' };
    const columns: string[] = [];
    for (const row of rows) for (const k of Object.keys(row)) if (!columns.includes(k)) columns.push(k);
    return { kind: 'table', columns, rows };
  }
  if (unwrap && typeof unwrap === 'object') {
    return { kind: 'pairs', rows: Object.entries(unwrap as Record<string, unknown>) };
  }
  return { kind: 'raw' };
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ---------------------------------------------------------------------------
// ERP invoices → fiscal source
// ---------------------------------------------------------------------------

/**
 * Outgoing (sales) invoice models per ERP, as the backend's Path A ingress
 * resolves them (fiscal/tasks.py _load_canonical: "<app_label>.<Model>").
 */
export const ERP_SALES_INVOICE_TYPES: Record<string, string> = {
  xero: 'erp_xero.XeroOutgoingInvoices',
  qbo: 'erp_qbo.QBOInvoice',
  erpnext: 'erp_erpnext.ERPNextInvoice',
};

export interface FiscalSourceRef {
  source_system: string;
  source_invoice_type: string;
  source_invoice_id: string;
}

/**
 * The fiscal source for a unified ERP invoice row. The unified list tags each
 * row with `provider` (xero | qbo | erpnext); rows without one are Xero.
 */
export function fiscalSourceForInvoice(invoice: { id: number | string; provider?: string | null }): FiscalSourceRef | null {
  const raw = (invoice.provider || 'xero').toLowerCase();
  const system = raw === 'quickbooks' ? 'qbo' : raw;
  const type = ERP_SALES_INVOICE_TYPES[system];
  if (!type) return null;
  return { source_system: system, source_invoice_type: type, source_invoice_id: String(invoice.id) };
}

/** Drafts and voided invoices are not issued, so they cannot be fiscalized. */
export function isFiscalizableInvoiceStatus(status?: string | null): boolean {
  const s = (status || '').toUpperCase();
  return s !== 'DRAFT' && s !== 'VOIDED' && s !== 'CANCELLED' && s !== 'DELETED';
}

/** The most recent fiscal document for a source invoice, if any. */
export function findDocumentForSource<T extends Pick<FiscalDocument, 'source_system' | 'source_invoice_id' | 'created_at'>>(
  docs: T[],
  source: Pick<FiscalSourceRef, 'source_system' | 'source_invoice_id'>,
): T | undefined {
  return docs
    .filter((d) => d.source_system === source.source_system && String(d.source_invoice_id) === source.source_invoice_id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))[0];
}

export function documentSourceKey(d: Pick<FiscalDocument, 'source_system' | 'source_invoice_id'>): string {
  return `${d.source_system}:${d.source_invoice_id}`;
}

/** Keep each source invoice's newest document. */
export function indexDocumentsBySource<T extends Pick<FiscalDocument, 'source_system' | 'source_invoice_id' | 'created_at'>>(
  docs: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const d of docs) {
    if (!d.source_system || !d.source_invoice_id) continue;
    const key = documentSourceKey(d);
    const existing = map.get(key);
    if (!existing || existing.created_at < d.created_at) map.set(key, d);
  }
  return map;
}

/**
 * Wrap receipt HTML so it renders inert: a CSP that forbids scripts and
 * network fetches (the QR is an inline data URI). The receipt is also shown
 * in a sandboxed iframe without allow-scripts.
 */
export function inertReceiptHtml(html: string): string {
  const csp =
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${csp}`);
  return `<!doctype html><html><head>${csp}</head><body>${html}</body></html>`;
}
