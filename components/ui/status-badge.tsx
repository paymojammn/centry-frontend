/**
 * Status Badge Component
 *
 * Consistent status badges using the Centry color system:
 * - #4E97D1 Blue - Draft
 * - #fed652 Mustard – Awaiting Approval
 * - #f77f00 Orange – Awaiting Payment
 * - #49a034 Green – Paid/Success
 * - #bec3c6 Grey - Repeating/Neutral
 * - #dc2626 Red - Failed/Error
 */

import { cn } from '@/lib/utils';
import { STATUS_COLORS, getStatusColor } from '@/lib/theme';

export type StatusType =
  | 'draft'
  | 'awaiting_approval'
  | 'awaiting_payment'
  | 'paid'
  | 'repeating'
  | 'failed'
  | 'success'
  | 'pending'
  | 'processing'
  | 'error';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const displayLabel = label || formatStatusLabel(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: colors.light,
        color: colors.bg,
      }}
    >
      {displayLabel}
    </span>
  );
}

// Format status string to display label
function formatStatusLabel(status: string): string {
  const statusLower = status.toLowerCase();

  const labelMap: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    awaiting_approval: 'Awaiting Approval',
    pending_approval: 'Pending Approval',
    pending_manager_approval: 'Pending Manager',
    pending_finance_approval: 'Pending Finance',
    manager_approved: 'Manager Approved',
    authorised: 'Awaiting Payment',
    awaiting_payment: 'Awaiting Payment',
    processing: 'Processing',
    paid: 'Paid',
    success: 'Success',
    approved: 'Approved',
    success_payment: 'Paid',
    repeating: 'Repeating',
    pending: 'Pending',
    failed: 'Failed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    failed_payment: 'Failed',
    error_payment: 'Error',
    error: 'Error',
  };

  return labelMap[statusLower] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Status dot - for inline use in dropdowns/selects
interface StatusDotProps {
  status: string;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const colors = getStatusColor(status);

  return (
    <span
      className={cn('w-2 h-2 rounded-full', className)}
      style={{ backgroundColor: colors.bg }}
    />
  );
}

// Combined status with dot and label
interface StatusWithDotProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusWithDot({ status, label, className }: StatusWithDotProps) {
  const displayLabel = label || formatStatusLabel(status);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <StatusDot status={status} />
      <span className="text-sm text-gray-700">{displayLabel}</span>
    </span>
  );
}
