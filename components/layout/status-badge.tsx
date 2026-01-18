/**
 * Status Badge Component
 *
 * Consistent status badges using the app color scheme.
 */

'use client';

import { getStatusColor } from '@/lib/theme';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const displayLabel = label || formatStatusLabel(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: color.light,
        color: color.bg === '#bec3c6' ? color.text : color.bg,
      }}
    >
      {displayLabel}
    </span>
  );
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

interface StatusDotProps {
  status: string;
}

export function StatusDot({ status }: StatusDotProps) {
  const color = getStatusColor(status);

  return (
    <span
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: color.bg }}
    />
  );
}
