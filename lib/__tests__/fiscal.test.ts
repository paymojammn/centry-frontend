import { describe, expect, it } from 'vitest';
import {
  CREDENTIAL_FIELDS,
  buildCredentialsPayload,
  canCancel,
  canRefresh,
  canRetry,
  cleanParams,
  findDocumentForSource,
  fiscalSourceForInvoice,
  fiscalStatusBadge,
  indexDocumentsBySource,
  inertReceiptHtml,
  isCredentialSet,
  isFiscalizableInvoiceStatus,
  jsonCredentialError,
  missingRequiredCredentials,
  normalizeInformationRequests,
  resolveCredentialFields,
  sourceInvoiceTypes,
  summarizeItemResults,
  supportsGoodsAndStock,
  tabulate,
  toPage,
  totalPages,
} from '@/lib/fiscal';

describe('fiscalStatusBadge', () => {
  it('maps every fiscal status onto the shared badge vocabulary', () => {
    expect(fiscalStatusBadge('fiscalized').badge).toBe('success');
    expect(fiscalStatusBadge('pending_approval').badge).toBe('pending_approval');
    expect(fiscalStatusBadge('received').badge).toBe('processing');
    expect(fiscalStatusBadge('sending').badge).toBe('processing');
    expect(fiscalStatusBadge('error').badge).toBe('failed');
    expect(fiscalStatusBadge('rejected').badge).toBe('failed');
    expect(fiscalStatusBadge('cancelled').badge).toBe('repeating');
    expect(fiscalStatusBadge('mystery')).toEqual({ badge: 'draft', label: 'mystery' });
  });

  it('prefers the server label', () => {
    expect(fiscalStatusBadge('fiscalized', 'Issued').label).toBe('Issued');
    expect(fiscalStatusBadge('fiscalized').label).toBe('Fiscalized');
  });
});

describe('document actions', () => {
  it('retries only error / rejected documents', () => {
    expect(canRetry({ status: 'error' })).toBe(true);
    expect(canRetry({ status: 'rejected' })).toBe(true);
    expect(canRetry({ status: 'fiscalized' })).toBe(false);
  });

  it('refreshes documents the authority knows about', () => {
    expect(canRefresh({ status: 'fiscalized', fdn: '123', approval_reference: '' })).toBe(true);
    expect(canRefresh({ status: 'pending_approval', fdn: '', approval_reference: 'A1' })).toBe(true);
    expect(canRefresh({ status: 'error', fdn: '', approval_reference: '' })).toBe(false);
    expect(canRefresh({ status: 'cancelled', fdn: '1', approval_reference: '' })).toBe(false);
  });

  it('cancels fiscalized invoices only', () => {
    expect(canCancel({ status: 'fiscalized', kind: 'invoice' })).toBe(true);
    expect(canCancel({ status: 'fiscalized', kind: 'credit_note' })).toBe(false);
    expect(canCancel({ status: 'error', kind: 'invoice' })).toBe(false);
  });
});

describe('credentials', () => {
  it('defines UG keys matching the EFRIS handler', () => {
    expect(CREDENTIAL_FIELDS.UG.map((f) => f.key)).toEqual([
      'app_id',
      'efris_version',
      'efris_username',
      'efris_url',
      'efris_url_online',
      'efris_device_no',
      'private_key_password',
      'price_tax_mode',
      'payment_mode',
    ]);
  });

  it('defines ZM / BJ keys matching the handlers', () => {
    const req = (cc: 'ZM' | 'BJ') => CREDENTIAL_FIELDS[cc].filter((f) => f.required).map((f) => f.key);
    const secret = (cc: 'ZM' | 'BJ') => CREDENTIAL_FIELDS[cc].filter((f) => f.secret).map((f) => f.key);
    expect(req('ZM')).toEqual(['zra_url', 'zra_terminal_id', 'zra_private_key', 'zra_signed_rsa_key', 'software_version']);
    expect(secret('ZM')).toEqual(['zra_private_key', 'zra_signed_rsa_key', 'zra_des_key']);
    expect(CREDENTIAL_FIELDS.ZM).toHaveLength(13);
    expect(req('BJ')).toEqual(['sfe_url', 'sfe_token']);
    expect(secret('BJ')).toEqual(['sfe_token']);
    expect(CREDENTIAL_FIELDS.BJ.map((f) => f.key)).toEqual([
      'sfe_url',
      'sfe_token',
      'ifu',
      'sfe_tax_group_map',
      'sfe_default_tax_group',
    ]);
    expect(CREDENTIAL_FIELDS.UG.filter((f) => f.secret).map((f) => f.key)).toEqual(['private_key_password']);
  });

  it('drops blanks (keep stored value) and unknown keys', () => {
    expect(buildCredentialsPayload('UG', { app_id: ' AP04 ', efris_username: '', sfe_token: 'x' })).toEqual({
      app_id: 'AP04',
    });
    expect(buildCredentialsPayload('UG', { app_id: '   ' })).toBeUndefined();
    expect(buildCredentialsPayload('XX', { app_id: 'a' })).toBeUndefined();
  });

  it('parses JSON maps and keeps multi-line keys', () => {
    expect(
      buildCredentialsPayload('ZM', {
        zra_tax_category_map: '{"VAT16": "A"}',
        zra_private_key: '-----BEGIN-----\r\nabc\r\n-----END-----\n',
      }),
    ).toEqual({ zra_tax_category_map: { VAT16: 'A' }, zra_private_key: '-----BEGIN-----\nabc\n-----END-----' });
    expect(jsonCredentialError('')).toBeNull();
    expect(jsonCredentialError('{"a":1}')).toBeNull();
    expect(jsonCredentialError('[1]')).toBe('Enter a JSON object.');
    expect(jsonCredentialError('{nope')).toBe('Invalid JSON.');
  });

  it('reports required keys neither stored nor entered', () => {
    expect(missingRequiredCredentials('BJ', { sfe_url: 'https://x' })).toEqual(['sfe_token']);
    expect(missingRequiredCredentials('BJ', { sfe_url: 'https://x' }, ['sfe_token'])).toEqual([]);
  });

  it('lets the server credential schema win, with static labels', () => {
    const schema = { BJ: { required: ['sfe_url', 'new_key'], optional: ['ifu'], secret: ['new_key'] } };
    const fields = resolveCredentialFields('BJ', schema);
    expect(fields.map((f) => [f.key, !!f.required, !!f.secret])).toEqual([
      ['sfe_url', true, false],
      ['new_key', true, true],
      ['ifu', false, false],
    ]);
    expect(fields[0]?.label).toBe('e-MECeF API URL');
    expect(fields[1]?.label).toBe('New key');
    expect(missingRequiredCredentials('BJ', {}, [], schema)).toEqual(['sfe_url', 'new_key']);
    expect(resolveCredentialFields('UG', schema)).toBe(CREDENTIAL_FIELDS.UG);
    expect(resolveCredentialFields('BJ', null)).toBe(CREDENTIAL_FIELDS.BJ);
  });

  it('limits goods & stock to UG', () => {
    expect(supportsGoodsAndStock('UG')).toBe(true);
    expect(supportsGoodsAndStock('ZM')).toBe(false);
    expect(supportsGoodsAndStock('BJ')).toBe(false);
  });
});

describe('credential set state', () => {
  it('treats per-environment keys as set', () => {
    expect(isCredentialSet('app_id', ['app_id'])).toBe(true);
    expect(isCredentialSet('app_id', ['staging.app_id'])).toBe(true);
    expect(isCredentialSet('app_id', ['production.app_id'])).toBe(true);
    expect(isCredentialSet('app_id', ['staging.efris_url'])).toBe(false);
    expect(missingRequiredCredentials('UG', {}, ['staging.app_id', 'production.efris_version'])).toEqual([
      'efris_username',
      'efris_url',
      'efris_url_online',
    ]);
  });

  it('ignores an unvalidated server schema', () => {
    const schema = { BJ: { required: ['x'], optional: [], secret: [], validated: false, label: 'Benin (DGI)' } };
    expect(resolveCredentialFields('BJ', schema)).toBe(CREDENTIAL_FIELDS.BJ);
  });
});

describe('item results', () => {
  it('summarizes goods / stock outcomes', () => {
    expect(summarizeItemResults({ ok: true, results: [{ ok: true }] })).toEqual({ ok: true, total: 1, failed: 0 });
    expect(summarizeItemResults({ ok: false, results: [{ ok: true }, { ok: false }] })).toEqual({
      ok: false,
      total: 2,
      failed: 1,
    });
    // Stock only lists failures; an empty list with ok=true is a full success.
    expect(summarizeItemResults({ ok: true, results: [] }).ok).toBe(true);
    expect(summarizeItemResults(undefined)).toEqual({ ok: true, total: 0, failed: 0 });
  });
});

describe('query helpers', () => {
  it('cleans params', () => {
    expect(
      cleanParams({ status: 'all', search: ' fdn ', page: 2, connection: '', kind: undefined, flag: true }),
    ).toEqual({ search: 'fdn', page: 2, flag: 'true' });
  });

  it('normalizes pages', () => {
    expect(toPage([1, 2])).toEqual({ count: 2, next: null, previous: null, results: [1, 2] });
    expect(toPage({ count: 9, next: 'n', previous: null, results: [1] }).count).toBe(9);
    expect(toPage(undefined).results).toEqual([]);
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(51, 25)).toBe(3);
  });

  it('normalizes information requests', () => {
    expect(
      normalizeInformationRequests([
        { key: 'taxpayer', label: 'Taxpayer', params: ['tin'] },
        { key: 'exchange_rate', params: [{ name: 'currency', required: true, help: 'e.g. USD' }] },
        { label: 'no key' },
      ]),
    ).toEqual([
      { key: 'taxpayer', label: 'Taxpayer', params: [{ name: 'tin', label: 'Tin' }] },
      { key: 'exchange_rate', label: 'Exchange rate', params: [{ name: 'currency', label: 'Currency', required: true, help: 'e.g. USD' }] },
    ]);
  });

  it('tabulates authority output', () => {
    expect(tabulate([{ a: 1 }, { b: 2 }])).toEqual({ kind: 'table', columns: ['a', 'b'], rows: [{ a: 1 }, { b: 2 }] });
    expect(tabulate({ results: [{ a: 1 }] }).kind).toBe('table');
    expect(tabulate({ rate: '3700' })).toEqual({ kind: 'pairs', rows: [['rate', '3700']] });
    expect(tabulate('x').kind).toBe('raw');
    expect(tabulate([1, 2]).kind).toBe('raw');
  });
});

describe('ERP invoice source', () => {
  it('maps providers to sales invoice models', () => {
    expect(fiscalSourceForInvoice({ id: 7 })).toEqual({
      source_system: 'xero',
      source_invoice_type: 'erp_xero.XeroOutgoingInvoices',
      source_invoice_id: '7',
    });
    expect(fiscalSourceForInvoice({ id: 3, provider: 'quickbooks' })?.source_invoice_type).toBe('erp_qbo.QBOInvoice');
    expect(fiscalSourceForInvoice({ id: 'u', provider: 'erpnext' })?.source_invoice_type).toBe(
      'erp_erpnext.ERPNextInvoice',
    );
    expect(fiscalSourceForInvoice({ id: 1, provider: 'sage' })).toBeNull();
  });

  it('finds the newest document for a source, keyed on type + id', () => {
    const X = 'erp_xero.XeroOutgoingInvoices';
    const docs = [
      { source_invoice_type: X, source_invoice_id: '7', created_at: '2026-01-01T00:00:00Z', id: 'old' },
      { source_invoice_type: X, source_invoice_id: '7', created_at: '2026-02-01T00:00:00Z', id: 'new' },
      { source_invoice_type: 'erp_qbo.QBOInvoice', source_invoice_id: '7', created_at: '2026-03-01T00:00:00Z', id: 'qbo' },
      { source_invoice_type: '', source_invoice_id: '', created_at: '2026-04-01T00:00:00Z', id: 'native' },
    ];
    expect(findDocumentForSource(docs, { source_invoice_type: X, source_invoice_id: '7' })?.id).toBe('new');
    const index = indexDocumentsBySource(docs);
    expect(index.get(`${X}:7`)?.id).toBe('new');
    expect(index.get('erp_qbo.QBOInvoice:7')?.id).toBe('qbo');
    expect(index.size).toBe(2);
  });

  it('lists distinct source invoice types on screen', () => {
    expect(sourceInvoiceTypes([{ id: 1 }, { id: 2, provider: 'xero' }, { id: 3, provider: 'qbo' }, { id: 4, provider: 'sage' }])).toEqual([
      'erp_qbo.QBOInvoice',
      'erp_xero.XeroOutgoingInvoices',
    ]);
  });

  it('only fiscalizes issued invoices', () => {
    expect(isFiscalizableInvoiceStatus('AUTHORISED')).toBe(true);
    expect(isFiscalizableInvoiceStatus('PAID')).toBe(true);
    expect(isFiscalizableInvoiceStatus('DRAFT')).toBe(false);
    expect(isFiscalizableInvoiceStatus('VOIDED')).toBe(false);
  });
});

describe('inertReceiptHtml', () => {
  it('injects a no-script CSP into the head', () => {
    const out = inertReceiptHtml('<html><head><title>R</title></head><body>x</body></html>');
    expect(out).toMatch(/<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'/);
  });

  it('wraps fragments', () => {
    expect(inertReceiptHtml('<p>x</p>')).toMatch(/^<!doctype html><html><head><meta/);
  });
});
