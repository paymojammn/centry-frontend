'use client';

/**
 * Pills shared by the Collections page and its match sheet. All tints are the
 * semantic utilities the `.status-pill` contract expects — no colour literals.
 */

import type { CollectionErp, CollectionInflow, CollectionStatus } from '@/hooks/use-collections';

const SUCCESS = 'bg-success-500/10 text-success-700 border-success-500/20';
const WARNING = 'bg-warning-500/10 text-warning-700 border-warning-500/20';
const INFO = 'bg-info-500/10 text-info-700 border-info-500/20';
const NEUTRAL = 'bg-muted text-muted-foreground border-border';

export const ERP_LABELS: Record<CollectionErp, string> = {
  xero: 'Xero',
  erpnext: 'ERPNext',
  qbo: 'QuickBooks',
  '': '',
};

export function erpLabel(erp?: CollectionErp | string | null) {
  return ERP_LABELS[(erp || '') as CollectionErp] || erp || '';
}

export function confidenceTint(confidence: number) {
  if (confidence >= 0.85) return SUCCESS;
  if (confidence >= 0.6) return WARNING;
  return NEUTRAL;
}

export function ConfidencePill({ confidence, partial }: { confidence: number; partial?: boolean }) {
  return (
    <span className={`status-pill ${confidenceTint(confidence)}`}>
      {Math.round(confidence * 100)}%{partial ? ' · partial' : ''}
    </span>
  );
}

export function StatusPill({ row }: { row: Pick<CollectionInflow, 'match_status' | 'match_confidence'> }) {
  const status = row.match_status === 'reviewed' ? 'matched' : row.match_status;
  switch (status as CollectionStatus) {
    case 'posted':
      return <span className={`status-pill ${SUCCESS}`}>Posted</span>;
    case 'matched':
      return <span className={`status-pill ${INFO}`}>Matched</span>;
    case 'suggested':
      return (
        <span className={`status-pill ${WARNING}`}>
          Suggested {Math.round((row.match_confidence || 0) * 100)}%
        </span>
      );
    default:
      return <span className={`status-pill ${NEUTRAL}`}>Unmatched</span>;
  }
}

export function SourcePill({ row }: { row: Pick<CollectionInflow, 'source_type' | 'source_provider' | 'bank_name'> }) {
  const mobile = row.source_type === 'mobile_money';
  return (
    <span className={`status-pill ${mobile ? INFO : NEUTRAL}`} title={row.source_provider || row.bank_name}>
      {mobile ? 'Mobile money' : 'Bank'}
    </span>
  );
}

export function ErpPill({ erp }: { erp?: CollectionErp | string | null }) {
  if (!erp) return null;
  return <span className={`status-pill ${NEUTRAL}`}>{erpLabel(erp)}</span>;
}
