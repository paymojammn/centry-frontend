import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { allocationsBalance, totalsFor } from '@/hooks/use-collections';
import { ConfidencePill, SourcePill, StatusPill } from '@/components/banking/collections/pills';

describe('allocationsBalance', () => {
  it('is balanced when the allocations sum to the credit', () => {
    const r = allocationsBalance([{ amount: '600000' }, { amount: 400000 }], 1_000_000);
    expect(r.balanced).toBe(true);
    expect(r.diff).toBe(0);
  });

  it('reports the remainder still to allocate', () => {
    const r = allocationsBalance([{ amount: '250.5' }], 1000);
    expect(r.balanced).toBe(false);
    expect(r.diff).toBe(749.5);
  });

  it('reports an over-allocation as a negative diff', () => {
    expect(allocationsBalance([{ amount: 1200 }], 1000).diff).toBe(-200);
  });

  it('tolerates sub-cent float noise', () => {
    expect(allocationsBalance([{ amount: 0.1 }, { amount: 0.2 }], 0.3).balanced).toBe(true);
  });
});

describe('totalsFor', () => {
  it('reads one currency out of the per-currency map and defaults to zero', () => {
    const totals = { UGX: { count: 3, amount: '1100000.00' } };
    expect(totalsFor(totals, 'UGX')).toEqual({ count: 3, amount: 1_100_000 });
    expect(totalsFor(totals, 'USD')).toEqual({ count: 0, amount: 0 });
    expect(totalsFor(undefined, 'UGX')).toEqual({ count: 0, amount: 0 });
  });
});

describe('pills', () => {
  it('shows the suggestion confidence as a percentage', () => {
    render(<StatusPill row={{ match_status: 'suggested', match_confidence: 0.87 }} />);
    expect(screen.getByText('Suggested 87%')).toBeInTheDocument();
  });

  it('folds reviewed into matched and labels posted rows', () => {
    render(
      <>
        <StatusPill row={{ match_status: 'reviewed', match_confidence: 1 }} />
        <StatusPill row={{ match_status: 'posted', match_confidence: 1 }} />
        <StatusPill row={{ match_status: 'unmatched', match_confidence: 0 }} />
      </>,
    );
    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(screen.getByText('Posted')).toBeInTheDocument();
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
  });

  it('distinguishes mobile money from bank inflows', () => {
    render(
      <>
        <SourcePill row={{ source_type: 'mobile_money', source_provider: 'MTN', bank_name: '' }} />
        <SourcePill row={{ source_type: 'bank', source_provider: '', bank_name: 'Stanbic' }} />
      </>,
    );
    expect(screen.getByText('Mobile money')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
  });

  it('marks partial suggestions', () => {
    render(<ConfidencePill confidence={0.62} partial />);
    expect(screen.getByText('62% · partial')).toBeInTheDocument();
  });
});
