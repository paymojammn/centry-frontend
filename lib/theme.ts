/**
 * Centry Design System - Theme Constants
 *
 * Premium European fintech aesthetic with muted, calm colors.
 *
 * STATUS COLORS (muted palette):
 * - var(--color-info) Soft Blue - Draft
 * - var(--color-warning-400) Warm Amber – Awaiting Approval
 * - var(--color-ochre) Muted Orange – Awaiting Payment
 * - var(--color-success) Soft Green – Paid/Success
 * - var(--color-neutral-300) Warm Grey - Repeating/Neutral
 * - var(--color-danger) Soft Red - Failed
 */

// Single vivid palette for the status-filter PILLS — uniform across the app
// (bills/invoices list pages and the processing/collections queues). Keyed by
// every status the filter bars use, mapped to the shared role colours:
// yellow=approval, blue=draft/processing, orange=outstanding/sent, green=paid,
// grey=neutral, red=failed, teal=accepted.
export const PILL_COLORS: Record<string, string> = {
  // document statuses (bills / invoices lists)
  draft: 'var(--color-info)',
  awaiting_approval: 'var(--color-warning-400)',
  awaiting_payment: 'var(--color-ochre)',
  reconcile: 'var(--color-reconcile)',
  sent: 'var(--color-warning-400)',
  outstanding: 'var(--color-ochre)',
  paid: 'var(--color-success)',
  repeating: 'var(--color-neutral-300)',
  // payment-event statuses (processing / collections queues)
  pending_approval: 'var(--color-warning-400)',
  processing: 'var(--color-info)',
  pending: 'var(--color-neutral-300)',
  accepted: 'var(--color-reconcile)',
  sent_payment: 'var(--color-ochre)',
  success: 'var(--color-success)',
  success_payment: 'var(--color-success)',
  failed: 'var(--color-danger)',
  failed_payment: 'var(--color-danger)',
  error_payment: 'var(--color-danger)',
  rejected: 'var(--color-danger)',
  reversed: 'var(--color-neutral-300)',
  // bank export-file statuses (outbox)
  generated: 'var(--color-info)',
  uploaded: 'var(--color-reconcile)',
  processed: 'var(--color-success)',
  superseded: 'var(--color-neutral-300)',
};

// Primary status colors used across bills, payments, and expenses
export const STATUS_COLORS = {
  draft: {
    bg: 'var(--color-info-600)',
    text: 'var(--color-white)',
    light: 'var(--color-info-50)',
    border: 'var(--color-info-600)',
  },
  awaiting_approval: {
    bg: 'var(--color-warning-600)',
    text: 'var(--color-white)',
    light: 'var(--color-warning-50)',
    border: 'var(--color-warning-600)',
  },
  awaiting_payment: {
    bg: 'var(--color-ochre-700)',
    text: 'var(--color-white)',
    light: 'var(--color-ochre-50)',
    border: 'var(--color-ochre-700)',
  },
  paid: {
    bg: 'var(--color-success-600)',
    text: 'var(--color-white)',
    light: 'var(--color-success-50)',
    border: 'var(--color-success-600)',
  },
  repeating: {
    bg: 'var(--color-neutral-500)',
    text: 'var(--color-white)',
    light: 'var(--color-neutral-50)',
    border: 'var(--color-neutral-500)',
  },
  failed: {
    bg: 'var(--color-danger-600)',
    text: 'var(--color-white)',
    light: 'var(--color-danger-50)',
    border: 'var(--color-danger-600)',
  },
  // Paid through the pipeline, awaiting bank-statement reconciliation
  reconcile: {
    bg: 'var(--color-reconcile)',
    text: 'var(--color-white)',
    light: 'var(--color-reconcile-50)',
    border: 'var(--color-reconcile)',
  },
} as const;

// Processing queue specific status colors
export const PROCESSING_STATUS_COLORS = {
  pending_approval: STATUS_COLORS.awaiting_approval,
  processing: STATUS_COLORS.draft,
  pending: STATUS_COLORS.repeating,
  sent: STATUS_COLORS.awaiting_payment,
  success: STATUS_COLORS.paid,
  failed: STATUS_COLORS.failed,
} as const;

// Page layout constants
export const LAYOUT = {
  maxWidth: 'max-w-7xl',
  pageBg: 'bg-[rgb(var(--page-bg))]',
  headerBg: 'bg-card',
  cardBg: 'bg-card',
  borderColor: 'border-border',
  borderLight: 'border-border/50',
} as const;

// Typography — premium, breathable hierarchy
export const TYPOGRAPHY = {
  pageTitle: 'text-xl font-semibold text-foreground',
  sectionTitle: 'text-lg font-medium text-foreground',
  label: 'text-xs font-medium text-muted-foreground uppercase tracking-wide',
  body: 'text-[15px] text-foreground',
  bodyMuted: 'text-[15px] text-muted-foreground',
  small: 'text-xs text-muted-foreground',
  caption: 'text-xs font-medium text-muted-foreground',
  balance: 'text-[32px] font-semibold text-foreground',
} as const;

// Spacing — 8pt grid system
export const SPACING = {
  page: 'px-6 py-6',
  header: 'px-6',
  headerHeight: 'h-16',
  card: 'p-6',
  cardLarge: 'p-8',
  gap: 'gap-5',
  gapSmall: 'gap-4',
  gapLarge: 'gap-6',
} as const;

// Common component styles
export const COMPONENTS = {
  // Buttons
  primaryButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondaryButton: 'bg-card border border-border text-foreground hover:bg-muted',
  successButton: 'text-white hover:opacity-90',
  dangerButton: 'text-white hover:opacity-90',

  // Inputs
  input: 'h-9 bg-card border-border text-sm',
  select: 'h-9 bg-card border-border text-sm',

  // Cards — 16px radius, soft shadow
  card: 'bg-card rounded-xl border border-border',
  cardWithShadow: 'bg-card rounded-xl border border-border shadow-sm',

  // Tables
  tableHeader: 'border-b border-border bg-muted',
  tableHeaderCell: 'px-4 py-3 text-left text-xs font-medium text-muted-foreground',
  tableRow: 'transition-colors hover:bg-muted',
  tableRowSelected: 'bg-primary/10',
  tableCell: 'px-4 py-3',

  // Tabs
  tabActive: 'border-primary text-primary',
  tabInactive: 'border-transparent text-muted-foreground hover:text-foreground',

  // Badges — pill style
  badge: 'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium',

  // Checkbox
  checkbox: 'w-4 h-4 rounded border-border text-primary focus:ring-primary',
} as const;

// Expense-specific status colors (muted palette)
export const EXPENSE_STATUS_COLORS = {
  pending_manager_approval: { bg: 'var(--color-warning-400)', text: 'var(--color-warning-900)', light: 'var(--color-warning-50)', border: 'var(--color-warning-400)' },
  pending_finance_approval: { bg: 'var(--color-heather)', text: 'var(--color-white)', light: 'var(--color-heather-50)', border: 'var(--color-heather)' },
  manager_approved: { bg: 'var(--color-info)', text: 'var(--color-white)', light: 'var(--color-info-50)', border: 'var(--color-info)' },
} as const;

// Helper function to get status color
export function getStatusColor(status: string) {
  const statusLower = status.toLowerCase().replace(/ /g, '_');

  // Check expense-specific statuses first
  if (statusLower === 'pending_manager_approval') {
    return EXPENSE_STATUS_COLORS.pending_manager_approval;
  }
  if (statusLower === 'pending_finance_approval') {
    return EXPENSE_STATUS_COLORS.pending_finance_approval;
  }
  if (statusLower === 'manager_approved') {
    return EXPENSE_STATUS_COLORS.manager_approved;
  }

  switch (statusLower) {
    case 'draft':
      return STATUS_COLORS.draft;
    case 'submitted':
    case 'awaiting_approval':
    case 'pending_approval':
      return STATUS_COLORS.awaiting_approval;
    case 'authorised':
    case 'awaiting_payment':
    case 'processing':
      return STATUS_COLORS.awaiting_payment;
    case 'reconcile':
      return STATUS_COLORS.reconcile;
    case 'paid':
    case 'success':
    case 'approved':
    case 'success_payment':
      return STATUS_COLORS.paid;
    case 'repeating':
    case 'pending':
      return STATUS_COLORS.repeating;
    case 'failed':
    case 'rejected':
    case 'cancelled':
    case 'failed_payment':
    case 'error_payment':
      return STATUS_COLORS.failed;
    default:
      return STATUS_COLORS.repeating;
  }
}

// Format large numbers with K/M suffix
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

// Get initials from name
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Format date for display
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format relative date
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}
