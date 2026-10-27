import { describe, it, expect } from 'vitest';
import { isSwiftOnlyRecipient, effectiveRecipientType } from '../RecipientDetailsStep';

describe('isSwiftOnlyRecipient', () => {
  it('is true for a SWIFT with no registry bank ("Other bank" saved account)', () => {
    expect(isSwiftOnlyRecipient({ swift_code: 'DEUTDEFF' })).toBe(true);
    expect(isSwiftOnlyRecipient({ swift_code: ' deut deff ' })).toBe(true);
  });

  it('is false once a registry bank is picked, or with no SWIFT', () => {
    expect(isSwiftOnlyRecipient({ recipient_bank_id: 4, swift_code: 'DEUTDEFF' })).toBe(false);
    expect(isSwiftOnlyRecipient({ swift_code: '' })).toBe(false);
    expect(isSwiftOnlyRecipient(undefined)).toBe(false);
  });
});

describe('effectiveRecipientType', () => {
  it('forces international for SWIFT-only recipients regardless of the toggle', () => {
    expect(effectiveRecipientType({ recipient_type: 'bank', swift_code: 'DEUTDEFF' }, 'bank')).toBe(
      'international',
    );
  });

  it('otherwise follows the recipient, then the toggle', () => {
    expect(
      effectiveRecipientType({ recipient_type: 'bank', recipient_bank_id: 1, swift_code: 'X' }, 'international'),
    ).toBe('bank');
    expect(effectiveRecipientType(undefined, 'international')).toBe('international');
  });
});
