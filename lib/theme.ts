/**
 * Centry Design System - Theme Constants
 *
 * Premium European fintech aesthetic with muted, calm colors.
 *
 * STATUS COLORS (muted palette):
 * - #6B8FB8 Soft Blue - Draft
 * - #D4B35A Warm Amber – Awaiting Approval
 * - #D4944A Muted Orange – Awaiting Payment
 * - #6B9B71 Soft Green – Paid/Success
 * - #9B9B9F Warm Grey - Repeating/Neutral
 * - #B85C5C Soft Red - Failed
 */

// Single vivid palette for the status-filter PILLS — uniform across the app
// (bills/invoices list pages and the processing/collections queues). Keyed by
// every status the filter bars use, mapped to the shared role colours:
// yellow=approval, blue=draft/processing, orange=outstanding/sent, green=paid,
// grey=neutral, red=failed, teal=accepted.
export const PILL_COLORS: Record<string, string> = {
  // document statuses (bills / invoices lists)
  draft: '#6B8FB8',
  awaiting_approval: '#fed652',
  awaiting_payment: '#f77f00',
  reconcile: '#2A9D8F',
  sent: '#fed652',
  outstanding: '#f77f00',
  paid: '#5C8A65',
  repeating: '#bec3c6',
  // payment-event statuses (processing / collections queues)
  pending_approval: '#fed652',
  processing: '#6B8FB8',
  pending: '#bec3c6',
  accepted: '#2A9D8F',
  sent_payment: '#f77f00',
  success: '#5C8A65',
  success_payment: '#5C8A65',
  failed: '#dc2626',
  failed_payment: '#dc2626',
  error_payment: '#dc2626',
  rejected: '#dc2626',
  reversed: '#bec3c6',
};

// Primary status colors used across bills, payments, and expenses
export const STATUS_COLORS = {
  draft: {
    bg: '#3F5E86',
    text: '#ffffff',
    light: '#EAF1F8',
    border: '#3F5E86',
  },
  awaiting_approval: {
    bg: '#8A6A1A',
    text: '#ffffff',
    light: '#FAF2DD',
    border: '#8A6A1A',
  },
  awaiting_payment: {
    bg: '#9A5A1E',
    text: '#ffffff',
    light: '#FBEEE0',
    border: '#9A5A1E',
  },
  paid: {
    bg: '#3E7A4E',
    text: '#ffffff',
    light: '#E7F3EB',
    border: '#3E7A4E',
  },
  repeating: {
    bg: '#56565C',
    text: '#ffffff',
    light: '#F1F1F2',
    border: '#56565C',
  },
  failed: {
    bg: '#9E3B3B',
    text: '#ffffff',
    light: '#FAEAEA',
    border: '#9E3B3B',
  },
  // Paid through the pipeline, awaiting bank-statement reconciliation
  reconcile: {
    bg: '#2A7E78',
    text: '#ffffff',
    light: '#E3F1EF',
    border: '#2A7E78',
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
  pending_manager_approval: { bg: '#D4B35A', text: '#5C4A1A', light: '#FAF5E8', border: '#D4B35A' },
  pending_finance_approval: { bg: '#8B7BB8', text: '#ffffff', light: '#F0ECF7', border: '#8B7BB8' },
  manager_approved: { bg: '#6B8FB8', text: '#ffffff', light: '#EDF2F7', border: '#6B8FB8' },
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
