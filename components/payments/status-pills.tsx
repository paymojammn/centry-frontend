/**
 * Status Pills
 *
 * Filter chips carrying a live count per status. Used on the Pay Out
 * approvals tab so the queue can be narrowed without leaving the page.
 * A pill with no matches is shown dimmed rather than hidden, so the set of
 * statuses stays stable as counts change.
 */

'use client';

import { cn } from '@/lib/utils';

export interface StatusPill {
  value: string;
  label: string;
  count: number;
  /** Tailwind classes for the active state. */
  tone?: 'neutral' | 'warning' | 'success' | 'danger' | 'info';
}

const TONES: Record<
  NonNullable<StatusPill['tone']>,
  { active: string; idle: string; dot: string }
> = {
  neutral: {
    active: 'bg-foreground text-background border-foreground',
    idle: 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted',
    dot: 'bg-muted-foreground',
  },
  warning: {
    active: 'bg-amber-500 text-white border-amber-500',
    idle: 'bg-amber-50 text-amber-700 border-transparent hover:bg-amber-100',
    dot: 'bg-amber-500',
  },
  success: {
    active: 'bg-primary text-primary-foreground border-primary',
    idle: 'bg-primary/5 text-primary border-transparent hover:bg-primary/10',
    dot: 'bg-primary',
  },
  danger: {
    active: 'bg-destructive text-white border-destructive',
    idle: 'bg-destructive/5 text-destructive border-transparent hover:bg-destructive/10',
    dot: 'bg-destructive',
  },
  info: {
    active: 'bg-sky-600 text-white border-sky-600',
    idle: 'bg-sky-50 text-sky-700 border-transparent hover:bg-sky-100',
    dot: 'bg-sky-600',
  },
};

interface StatusPillsProps {
  pills: StatusPill[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StatusPills({ pills, value, onChange, className }: StatusPillsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="tablist">
      {pills.map((pill) => {
        const tone = TONES[pill.tone || 'neutral'];
        const active = pill.value === value;
        const empty = pill.count === 0 && !active;

        return (
          <button
            key={pill.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(pill.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
              'text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? tone.active : tone.idle,
              empty && 'opacity-50'
            )}
          >
            {!active && <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />}
            {pill.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                active ? 'bg-white/20' : 'bg-background/60'
              )}
            >
              {pill.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
