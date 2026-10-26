/**
 * Sync History
 *
 * Recent ERP sync runs for an organization (or one connection), fed by
 * GET /api/v1/erp/sync-logs/. Re-polls while any listed run is in flight.
 */

'use client';

import { History } from 'lucide-react';
import { ContentCard, ContentCardHeader } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useSyncLogs } from '@/hooks/use-erp';
import { describeCounts, formatDuration, relativeTime, syncBadge } from '@/lib/erp-sync';
import type { SyncLog } from '@/lib/erp-api';

interface SyncHistoryCardProps {
  organizationId?: string;
  connectionId?: string;
  limit?: number;
  className?: string;
}

const TRIGGER_LABEL: Record<SyncLog['trigger'], string> = {
  manual: 'Manual',
  scheduled: 'Scheduled',
  resync: 'Re-sync',
  webhook: 'Webhook',
  api: 'API',
};

export function SyncHistoryCard({
  organizationId,
  connectionId,
  limit = 10,
  className = '',
}: SyncHistoryCardProps) {
  const { data, isLoading, error } = useSyncLogs(
    { organization: organizationId, connection: connectionId },
    { enabled: !!(organizationId || connectionId) }
  );
  const rows = (data?.results ?? []).slice(0, limit);

  return (
    <ContentCard noPadding className={className}>
      <ContentCardHeader>
        <h3 className="text-lg font-semibold text-foreground">Sync history</h3>
        <p className="text-sm text-muted-foreground">
          Recent pulls from your connected ERP systems
        </p>
      </ContentCardHeader>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState
          icon={History}
          title="Could not load sync history"
          description={(error as Error).message}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No syncs yet"
          description="Runs appear here once a sync is triggered or scheduled."
        />
      ) : (
        <div className="table-professional overflow-x-auto">
          <table className="table-professional w-full">
            <thead>
              <tr>
                <th>When</th>
                <th>Entity</th>
                <th>Status</th>
                <th className="text-right">Fetched</th>
                <th className="text-right">Created</th>
                <th className="text-right">Updated</th>
                <th>Duration</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => {
                const badge = syncBadge(log.status);
                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap">
                      <div className="text-sm text-foreground">{relativeTime(log.started_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.connection_name || log.provider?.name || 'Connection'} ·{' '}
                        {TRIGGER_LABEL[log.trigger] ?? log.trigger}
                        {log.full_sync ? ' · full' : ''}
                      </div>
                    </td>
                    <td className="capitalize text-sm text-foreground">{log.entity}</td>
                    <td>
                      <StatusBadge status={badge.status} label={badge.label} size="sm" />
                    </td>
                    <td className="text-right text-sm tabular-nums text-foreground">
                      {log.fetched.toLocaleString()}
                    </td>
                    <td className="text-right text-sm tabular-nums text-foreground">
                      {log.created.toLocaleString()}
                    </td>
                    <td className="text-right text-sm tabular-nums text-foreground">
                      {log.updated.toLocaleString()}
                    </td>
                    <td className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDuration(log.duration_seconds)}
                    </td>
                    <td className="max-w-[16rem]">
                      {log.error_message ? (
                        <span
                          className="block truncate text-xs text-danger"
                          title={log.error_message}
                        >
                          {log.error_message}
                        </span>
                      ) : log.status === 'completed' || log.status === 'success' ? (
                        <span className="text-xs text-muted-foreground">
                          {describeCounts(log)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ContentCard>
  );
}

export default SyncHistoryCard;
