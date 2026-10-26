/**
 * Pure helpers for presenting ERP sync runs (SyncLog rows).
 * Kept free of React so they are unit-testable.
 */

import { formatDistanceToNow } from 'date-fns';
import type { SyncLog, SyncLogStatus } from './erp-api';

export type SyncBadge = {
  /** StatusBadge status key (maps onto the theme's status colours). */
  status: 'processing' | 'success' | 'failed' | 'awaiting_approval' | 'pending';
  label: string;
};

export function isSyncRunning(log: SyncLog | null | undefined): boolean {
  return !!log && (log.is_running || log.status === 'running' || log.status === 'started');
}

export function isSyncFailed(log: SyncLog | null | undefined): boolean {
  return !!log && log.status === 'failed';
}

export function syncBadge(status: SyncLogStatus | string): SyncBadge {
  switch (status) {
    case 'running':
    case 'started':
      return { status: 'processing', label: 'Running' };
    case 'completed':
    case 'success':
      return { status: 'success', label: 'Completed' };
    case 'partial':
      return { status: 'awaiting_approval', label: 'Partial' };
    case 'failed':
      return { status: 'failed', label: 'Failed' };
    default:
      return { status: 'pending', label: status || 'Unknown' };
  }
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds - mins * 60);
  return secs ? `${mins}m ${secs}s` : `${mins}m`;
}

/** "12 min ago" style relative time; empty string for null. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * One-line summary shown next to the Sync button:
 *   "Last synced 12 minutes ago · 340 bills"
 */
export function describeLastSync(
  lastSyncAt: string | null | undefined,
  billsTotal: number | null | undefined,
  entity = 'bills'
): string {
  if (!lastSyncAt) return 'Never synced';
  const when = relativeTime(lastSyncAt);
  const parts = [`Last synced ${when}`];
  if (typeof billsTotal === 'number') {
    parts.push(`${billsTotal.toLocaleString()} ${entity}`);
  }
  return parts.join(' · ');
}

/** Short "+3 new, 12 updated" from a finished run. */
export function describeCounts(log: Pick<SyncLog, 'fetched' | 'created' | 'updated' | 'skipped'>): string {
  const parts: string[] = [];
  if (log.created) parts.push(`${log.created} new`);
  if (log.updated) parts.push(`${log.updated} updated`);
  if (log.skipped) parts.push(`${log.skipped} skipped`);
  if (!parts.length) return `${log.fetched} fetched`;
  return parts.join(', ');
}
