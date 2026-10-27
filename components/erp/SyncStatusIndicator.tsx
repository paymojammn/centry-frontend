/**
 * Sync Status Indicator
 *
 * Sits next to the "Sync" button on ERP list pages and reflects the latest
 * sync run for the active connection:
 *   - "Last synced 12 minutes ago · 340 bills" when idle
 *   - spinner + "Syncing…" while a run is in flight (polled every 3s)
 *   - "Sync failed — <error>" with a Retry action after a failure
 */

'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/hooks/use-erp';
import { describeLastSync, isSyncFailed } from '@/lib/erp-sync';

interface SyncStatusIndicatorProps {
  connectionId: string | null | undefined;
  entity?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
}

export function SyncStatusIndicator({
  connectionId,
  entity = 'bills',
  onRetry,
  retryDisabled = false,
  className = '',
}: SyncStatusIndicatorProps) {
  const { data, latest, isSyncRunning, isLoading } = useSyncStatus(connectionId, entity);

  if (!connectionId || isLoading) return null;

  if (isSyncRunning) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
        Syncing…
      </span>
    );
  }

  if (isSyncFailed(latest)) {
    const error = latest?.error_message?.trim() || 'Unknown error';
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-danger ${className}`}
        role="status"
        aria-live="polite"
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[18rem] truncate" title={error}>
          Sync failed — {error}
        </span>
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs font-medium text-primary underline-offset-2 hover:underline hover:bg-transparent"
            onClick={onRetry}
            disabled={retryDisabled}
          >
            Retry
          </Button>
        )}
      </span>
    );
  }

  return (
    <span className={`text-xs text-muted-foreground ${className}`} role="status">
      {describeLastSync(data?.last_sync_at, data?.bills_total, entity)}
    </span>
  );
}

export default SyncStatusIndicator;
