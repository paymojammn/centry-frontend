/**
 * Stat Card Component
 *
 * Compact card for displaying a single statistic.
 * Used in grids for page summary sections.
 * Features smooth hover effects and optional trend indicators.
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  iconColor?: string; // Hex color
  iconBgColor?: string; // Hex color (light version)
  trend?: {
    value: number; // Percentage change
    isPositive?: boolean; // Override auto-detection
  };
  variant?: 'default' | 'accent' | 'warning' | 'danger';
  children?: ReactNode; // For action buttons
}

const variantStyles = {
  default: {
    card: 'bg-white border-gray-200/80',
    icon: '#9ca3af',
    iconBg: '#f5f5f5',
  },
  accent: {
    card: 'bg-white border-l-4 border-l-[#49a034] border-gray-200/80',
    icon: '#49a034',
    iconBg: 'rgba(73, 160, 52, 0.1)',
  },
  warning: {
    card: 'bg-white border-l-4 border-l-amber-500 border-gray-200/80',
    icon: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.1)',
  },
  danger: {
    card: 'bg-white border-l-4 border-l-red-500 border-gray-200/80',
    icon: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.1)',
  },
};

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  variant = 'default',
  children,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const trendIsPositive = trend?.isPositive ?? (trend?.value ?? 0) >= 0;

  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        styles.card
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  trendIsPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trendIsPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div
            className="p-2.5 rounded-xl flex-shrink-0"
            style={{ backgroundColor: iconBgColor || styles.iconBg }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: iconColor || styles.icon }}
            />
          </div>
        )}
      </div>
      {subtext && (
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">{subtext}</p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Compact variant for dense layouts
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
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
