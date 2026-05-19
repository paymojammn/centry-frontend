/**
 * Stats Bar Component
 *
 * Compact horizontal stats display below the header.
 * Uses colored dots and badges for visual distinction.
 */

'use client';

import { ReactNode } from 'react';

interface Stat {
  label: string;
  value: string | number;
  color?: string; // Hex color for the dot
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface StatsBarProps {
  stats: Stat[];
}

const VARIANT_COLORS = {
  default: { bg: 'bg-muted', text: 'text-foreground' },
  success: { bg: 'bg-primary/5', text: 'text-primary' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700' },
  danger: { bg: 'bg-destructive/5', text: 'text-destructive' },
  info: { bg: 'bg-primary/5', text: 'text-primary' },
};

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="bg-card border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-center gap-6 flex-wrap">
          {stats.map((stat, index) => {
            const variant = VARIANT_COLORS[stat.variant || 'default'];
            return (
              <div key={index} className="flex items-center gap-2">
                {stat.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                )}
                <span className="text-sm text-muted-foreground">{stat.label}:</span>
                <span
                  className={`px-2 py-0.5 rounded text-sm font-medium ${variant.bg} ${variant.text}`}
                >
                  {stat.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
