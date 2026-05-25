'use client';

import { ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuditLogs } from '@/hooks/use-reports';
import type { AuditLog, AuditSeverity } from '@/types/reports';
import { cn } from '@/lib/utils';

/**
 * Notifications sheet — Azure-portal-style activity feed.
 *
 * Sources real events from /api/v1/security/audit-logs/ (via useAuditLogs),
 * groups them by day, and renders each as an icon-led row with severity
 * tint, target representation, user attribution, and a relative time.
 *
 * Filter chips at the top scope to a single severity. The footer links to
 * the full audit page so the sheet stays scannable.
 */

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

const SEVERITY_STYLES: Record<
  AuditSeverity,
  { icon: typeof Info; bg: string; text: string; ring: string; label: string }
> = {
  info: {
    icon: Info,
    bg: 'bg-blue-500/10',
    text: 'text-blue-700',
    ring: 'ring-blue-500/20',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    ring: 'ring-amber-500/20',
    label: 'Warning',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    ring: 'ring-red-500/20',
    label: 'Error',
  },
  critical: {
    icon: AlertOctagon,
    bg: 'bg-red-600/15',
    text: 'text-red-800',
    ring: 'ring-red-600/25',
    label: 'Critical',
  },
};

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const { data, isLoading, isFetching, refetch } = useAuditLogs({
    page_size: 30,
    ordering: '-timestamp',
  });

  const events = useMemo<AuditLog[]>(() => {
    const all = data?.results ?? [];
    if (severityFilter === 'all') return all;
    if (severityFilter === 'critical') {
      return all.filter((e) => e.severity === 'critical' || e.severity === 'error');
    }
    return all.filter((e) => e.severity === severityFilter);
  }, [data, severityFilter]);

  const grouped = useMemo(() => groupByDay(events), [events]);

  const unreadCount = data?.results?.filter(
    (e) => e.severity === 'critical' || e.severity === 'error',
  ).length ?? 0;

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="gap-0 sm:w-[440px] inset-5 start-auto h-auto rounded-lg p-0 sm:max-w-none [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5 flex flex-col">
        <SheetHeader className="mb-0 border-b border-border">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-normal flex items-center gap-2">
                Activity
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500/10 text-red-700 text-[10px] font-medium tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </SheetTitle>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              </button>
            </div>
            <FilterChips value={severityFilter} onChange={setSeverityFilter} />
          </div>
        </SheetHeader>

        <SheetBody className="grow p-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState filtered={severityFilter !== 'all'} />
          ) : (
            <div>
              {grouped.map((group) => (
                <div key={group.key}>
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-card/95 backdrop-blur-sm border-b border-border">
                    <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground">
                      {group.label}
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <NotificationRow key={item.id} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SheetBody>

        {/* Footer — link to full audit log */}
        <div className="border-t border-border px-4 py-3 bg-card">
          <Link
            href="/reports/audit"
            className="inline-flex items-center gap-1.5 text-[12px] font-normal text-primary hover:opacity-80 transition-opacity"
          >
            View all activity
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function FilterChips({
  value,
  onChange,
}: {
  value: SeverityFilter;
  onChange: (v: SeverityFilter) => void;
}) {
  const chips: { key: SeverityFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Issues' },
    { key: 'warning', label: 'Warnings' },
    { key: 'info', label: 'Info' },
  ];
  return (
    <div className="flex items-center gap-1 mt-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-normal transition-colors',
            value === c.key
              ? 'bg-foreground text-card'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function NotificationRow({ item }: { item: AuditLog }) {
  const style = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.info;
  const Icon = style.icon;
  const when = new Date(item.timestamp);
  const relative = formatDistanceToNow(when, { addSuffix: true })
    .replace('about ', '')
    .replace('less than a ', '<')
    .replace('minute', 'min')
    .replace(' ago', '');

  // Build a concise byline: who · target · status
  const parts: string[] = [];
  if (item.user_name) parts.push(item.user_name);
  if (item.target_representation) parts.push(item.target_representation);
  if (!item.success) parts.push('failed');

  return (
    <li className="px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'size-7 rounded-full flex items-center justify-center ring-1 shrink-0',
            style.bg,
            style.ring,
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', style.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] text-foreground truncate">
              {item.action_display || item.action_type}
            </p>
            <span
              className="text-[11px] text-muted-foreground/80 shrink-0 tabular-nums"
              title={format(when, 'PPpp')}
            >
              {relative}
            </span>
          </div>
          {parts.length > 0 && (
            <p className="text-[12px] text-muted-foreground truncate mt-0.5">
              {parts.join(' · ')}
            </p>
          )}
          {item.error_message && (
            <p className="text-[11px] text-red-600 truncate mt-0.5" title={item.error_message}>
              {item.error_message}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Bell className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-normal text-foreground">
        {filtered ? 'Nothing here' : 'No notifications'}
      </p>
      <p className="text-xs text-muted-foreground mt-1 text-center max-w-[260px]">
        {filtered
          ? 'Try a different filter — there are no events at this severity.'
          : 'Notifications about payments, approvals, and system events will appear here.'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function groupByDay(events: AuditLog[]): Array<{
  key: string;
  label: string;
  items: AuditLog[];
}> {
  const buckets = new Map<string, { label: string; items: AuditLog[] }>();
  for (const e of events) {
    const d = new Date(e.timestamp);
    const key = format(d, 'yyyy-MM-dd');
    if (!buckets.has(key)) {
      let label: string;
      if (isToday(d)) label = 'Today';
      else if (isYesterday(d)) label = 'Yesterday';
      else label = format(d, 'EEE, MMM d');
      buckets.set(key, { label, items: [] });
    }
    buckets.get(key)!.items.push(e);
  }
  // Keep insertion order (already sorted by -timestamp from the API).
  return Array.from(buckets.entries()).map(([key, val]) => ({
    key,
    label: val.label,
    items: val.items,
  }));
}
