import { describe, expect, it } from 'vitest';
import {
  describeCounts,
  describeLastSync,
  formatDuration,
  isSyncFailed,
  isSyncRunning,
  syncBadge,
} from '../erp-sync';
import type { SyncLog } from '../erp-api';

const base: SyncLog = {
  id: 1,
  connection: 'c1',
  connection_name: 'Main',
  provider: { code: 'qbo', name: 'QuickBooks' },
  organization: 'o1',
  entity: 'bills',
  operation: 'pull_bills',
  trigger: 'manual',
  status: 'completed',
  is_running: false,
  full_sync: true,
  since: null,
  celery_task_id: '',
  fetched: 10,
  created: 3,
  updated: 7,
  skipped: 0,
  records_failed: 0,
  error_message: '',
  started_at: '2026-10-26T10:00:00Z',
  completed_at: '2026-10-26T10:00:42Z',
  duration_seconds: 42,
};

describe('erp-sync helpers', () => {
  it('detects running and failed runs', () => {
    expect(isSyncRunning({ ...base, status: 'running', is_running: true })).toBe(true);
    expect(isSyncRunning(base)).toBe(false);
    expect(isSyncRunning(null)).toBe(false);
    expect(isSyncFailed({ ...base, status: 'failed' })).toBe(true);
    expect(isSyncFailed(base)).toBe(false);
  });

  it('maps statuses onto badge variants', () => {
    expect(syncBadge('running')).toEqual({ status: 'processing', label: 'Running' });
    expect(syncBadge('completed').status).toBe('success');
    expect(syncBadge('success').label).toBe('Completed');
    expect(syncBadge('failed').status).toBe('failed');
    expect(syncBadge('partial').label).toBe('Partial');
    expect(syncBadge('weird').label).toBe('weird');
  });

  it('formats durations', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0.4)).toBe('<1s');
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(180)).toBe('3m');
  });

  it('describes the last sync line', () => {
    expect(describeLastSync(null, 5)).toBe('Never synced');
    const recent = new Date(Date.now() - 12 * 60 * 1000).toISOString();
    expect(describeLastSync(recent, 340)).toBe('Last synced 12 minutes ago · 340 bills');
    expect(describeLastSync(recent, null)).toBe('Last synced 12 minutes ago');
  });

  it('describes counts', () => {
    expect(describeCounts(base)).toBe('3 new, 7 updated');
    expect(describeCounts({ fetched: 4, created: 0, updated: 0, skipped: 0 })).toBe('4 fetched');
    expect(describeCounts({ fetched: 4, created: 0, updated: 2, skipped: 2 })).toBe(
      '2 updated, 2 skipped'
    );
  });
});
