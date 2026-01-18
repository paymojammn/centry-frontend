/**
 * Stat Card Component
 *
 * Compact card for displaying a single statistic.
 * Used in grids for page summary sections.
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  iconColor?: string; // Hex color
  iconBgColor?: string; // Hex color (light version)
  children?: ReactNode; // For action buttons
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor,
  iconBgColor,
  children,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        {Icon && (
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: iconBgColor || '#f5f5f5' }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: iconColor || '#9ca3af' }}
            />
          </div>
        )}
      </div>
      {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
      {children}
    </div>
  );
}
