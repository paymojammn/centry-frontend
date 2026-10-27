import { describe, it, expect } from 'vitest';
import { vendorDetailPath, normalizeSwift, SWIFT_CODE_RE } from '../contacts-api';

describe('vendorDetailPath', () => {
  it('routes by erp + detail_ref', () => {
    expect(vendorDetailPath({ id: 7, erp: 'erpnext', detail_ref: 'abc-uuid' })).toBe(
      '/erp/vendors/erpnext/abc-uuid',
    );
    expect(vendorDetailPath({ id: 3, erp: 'qbo', detail_ref: '3' })).toBe('/erp/vendors/qbo/3');
  });

  it('falls back to provider, then xero, and to id when detail_ref is absent', () => {
    expect(vendorDetailPath({ id: 12, provider: 'xero' })).toBe('/erp/vendors/xero/12');
    expect(vendorDetailPath({ id: 12 })).toBe('/erp/vendors/xero/12');
  });
});

describe('SWIFT helpers', () => {
  it('normalises and validates 8/11-char BICs', () => {
    expect(normalizeSwift(' deut deff ')).toBe('DEUTDEFF');
    expect(SWIFT_CODE_RE.test(normalizeSwift('deutdeff'))).toBe(true);
    expect(SWIFT_CODE_RE.test('SBICUGKXXXX')).toBe(true);
    expect(SWIFT_CODE_RE.test('SB1CUG')).toBe(false);
  });
});
