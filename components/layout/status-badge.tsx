/**
 * Status Badge Component
 *
 * Consistent status badges using the app color scheme.
 * Features icons, multiple sizes, and visual variants.
 */

'use client';

import { getStatusColor } from '@/lib/theme';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Map status to appropriate icon
const statusIcons: Record<string, React.ElementType> = {
  draft: FileText,
  awaiting_approval: Clock,
  pending_approval: Clock,
  submitted: Clock,
  awaiting_payment: AlertCircle,
  authorised: AlertCircle,
  processing: Loader2,
  paid: CheckCircle,
  success: CheckCircle,
  approved: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
  cancelled: XCircle,
  repeating: RefreshCw,
  pending: Clock,
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'solid';
  pulse?: boolean; // Animate for urgent statuses
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = false,
  variant = 'default',
  pulse = false,
}: StatusBadgeProps) {
  const color = getStatusColor(status);
  const displayLabel = label || formatStatusLabel(status);
  const statusKey = status.toLowerCase().replace(/ /g, '_');
  const Icon = statusIcons[statusKey];

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const getVariantStyles = () => {
    const textColor = color.bg === '#9B9B9F' ? color.text : color.bg;

    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: textColor,
          border: `1px solid ${color.bg}`,
        };
      case 'solid':
        return {
          backgroundColor: color.bg,
          color: color.text,
        };
      default:
        return {
          backgroundColor: color.light,
          color: textColor,
        };
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all duration-200',
        sizes[size],
        pulse && 'animate-pulse-soft'
      )}
      style={getVariantStyles()}
    >
      {showIcon && Icon && (
        <Icon
          className={cn(
            iconSizes[size],
            statusKey === 'processing' && 'animate-spin'
          )}
        />
      )}
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
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function StatusDot({ status, size = 'md', pulse = false }: StatusDotProps) {
  const color = getStatusColor(status);

  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={cn(
        'rounded-full flex-shrink-0',
        sizes[size],
        pulse && 'animate-pulse-soft'
      )}
      style={{ backgroundColor: color.bg }}
    />
  );
}

// Combined badge with dot and text
interface StatusIndicatorProps {
  status: string;
  label?: string;
  showDot?: boolean;
}

export function StatusIndicator({ status, label, showDot = true }: StatusIndicatorProps) {
  const color = getStatusColor(status);
  const displayLabel = label || formatStatusLabel(status);
  const textColor = color.bg === '#9B9B9F' ? color.text : color.bg;

  return (
    <span className="inline-flex items-center gap-2">
      {showDot && <StatusDot status={status} />}
      <span className="text-xs font-medium" style={{ color: textColor }}>
        {displayLabel}
      </span>
    </span>
  );
}
