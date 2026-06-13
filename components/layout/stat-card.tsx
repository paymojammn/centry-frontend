/**
 * Stat Card — thin wrapper over MetricTile.
 *
 * Kept for backwards compatibility with the ~37 existing call sites.
 * All new code should import MetricTile directly. Visual style is owned
 * by MetricTile so the whole app stays uniform.
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { MetricTile } from '@/components/reports/MetricTile';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  /** Ignored — kept for prop-compat. Icon color is now tone-driven. */
  iconColor?: string;
  /** Ignored — kept for prop-compat. Icon bg is now tone-driven. */
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  variant?: 'default' | 'accent' | 'warning' | 'danger' | 'success' | 'info';
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  variant = 'default',
  children,
  onClick,
  className,
}: StatCardProps) {
  return (
    <MetricTile
      label={label}
      value={value}
      hint={subtext}
      icon={icon}
      tone={variant}
      trend={
        trend
          ? {
              value: trend.value,
              positiveIsGood: trend.isPositive ?? true,
            }
          : undefined
      }
      footer={children ? <div className="mt-3">{children}</div> : undefined}
      onClick={onClick}
      className={className}
    />
  );
}

// Compact variant for dense list layouts (sidebar lists, tooltips).
// Not a card — left as-is.
interface CompactStatProps {
  label: string;
  value: string | number;
  color?: string;
}

export function CompactStat({ label, value, color }: CompactStatProps) {
  return (
    <div className="flex items-center gap-3">
      {color && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
